/**
 * Starting, resuming, saving and submitting. The server clock decides everything; times sent by
 * the browser are never used. Every entry point checks that the attempt belongs to the caller.
 */
import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { readSettings } from '@/lib/monitoring'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { serverNow } from '@/lib/server/time'
import { attemptDeadline, candidateAccess } from '@/lib/services/access'
import { announcementsFor } from '@/lib/services/announcements'
import { audit } from '@/lib/services/audit'
import { finalizeAttempt, finalizeExpired, GRACE_MS, isPastDeadline } from '@/lib/services/finalize'
import { noteContact, recordIncident } from '@/lib/services/incidents'
import { candidateQuestion, toOptionIds } from '@/lib/services/paper'
import { buildPaper, PAPER_QUESTIONS } from '@/lib/services/paper-build'
import { getPreferences } from '@/lib/services/preferences'
import type { SaveAnswerInput } from '@/lib/validation/attempts'

const MAX_WRITTEN = 20_000

// ---------- starting ----------

async function createAttempt(candidateId: number, examId: number) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: { examId, candidateId, exam: { status: 'PUBLISHED' } },
      include: {
        exam: { include: { questions: PAPER_QUESTIONS } },
      },
    })
    if (!enrollment) throw new ApiError('NOT_FOUND', 'Not found')

    const { exam, extraMinutes } = enrollment
    const now = serverNow()
    const access = candidateAccess(exam, extraMinutes, null, now)
    if (!access.canEnter) throw new ApiError('CONFLICT', access.reason)

    const attempt = await tx.attempt.create({
      data: {
        examId,
        candidateId,
        realSlot: 1, // unique with exam and candidate: two parallel starts can't both succeed
        startedAt: now,
        lastSeenAt: now,
        deadlineAt: attemptDeadline(now, exam, extraMinutes),
        ...(await buildPaper(tx, exam)),
      },
      select: { id: true, activeSessionId: true },
    })
    await audit(tx, candidateId, 'attempt_started', 'attempt', attempt.id, { examId })
    return attempt
  })
}

const findReal = (candidateId: number, examId: number) =>
  prisma.attempt.findFirst({
    where: { examId, candidateId, isSandbox: false },
    select: { id: true, status: true, activeSessionId: true },
  })

/**
 * Starts the attempt (only when `start` is true) or returns the existing one. A browser that
 * doesn't hold the current session takes it over, and the other one can no longer save.
 */
export async function openAttempt(actor: Actor, examId: number, start: boolean, sessionId?: string) {
  await finalizeExpired({ candidateId: actor.id, examId })
  let existing = await findReal(actor.id, examId)

  if (!existing) {
    if (!start) throw new ApiError('CONFLICT', 'This attempt has not been started')
    try {
      const created = await createAttempt(actor.id, examId)
      return { attempt: await viewAttempt(actor, created.id), sessionId: created.activeSessionId }
    } catch (error) {
      // A parallel request won the race: continue with its attempt
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error
      existing = await findReal(actor.id, examId)
      if (!existing) throw error
      return { attempt: await viewAttempt(actor, existing.id), sessionId: existing.activeSessionId }
    }
  }

  if (existing.status !== 'IN_PROGRESS') throw new ApiError('CONFLICT', 'You have already submitted this examination')

  let active = existing.activeSessionId
  await noteContact(existing.id) // a long silence before reopening is recorded
  if (sessionId !== active) {
    active = randomUUID()
    await prisma.attempt.update({ where: { id: existing.id }, data: { activeSessionId: active } })
    await recordIncident(existing.id, 'SESSION_TAKEOVER')
  }
  return { attempt: await viewAttempt(actor, existing.id), sessionId: active }
}

// ---------- reading ----------

/** A candidate's own real attempt, or a staff member's own sandbox of an examination they manage. */
async function ownAttempt(actor: Actor, attemptId: number) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      candidateId: true,
      isSandbox: true,
      status: true,
      deadlineAt: true,
      activeSessionId: true,
      exam: { select: { ownerId: true } },
    },
  })
  return ensureFound(
    attempt,
    (a) => a.candidateId === actor.id && (a.isSandbox ? canManageExam(actor, a.exam) : actor.role === 'CANDIDATE')
  )
}

/** Finalizes first if time is up, so a caller never sees an expired attempt as running. */
export async function currentAttempt(actor: Actor, attemptId: number) {
  const attempt = await ownAttempt(actor, attemptId)
  if (attempt.status === 'IN_PROGRESS' && isPastDeadline(attempt.deadlineAt)) {
    await finalizeAttempt(attemptId, 'TIME_EXPIRED')
    return ownAttempt(actor, attemptId)
  }
  return attempt
}

export async function viewAttempt(actor: Actor, attemptId: number) {
  const current = await currentAttempt(actor, attemptId)
  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: current.id },
    select: {
      id: true,
      status: true,
      submitReason: true,
      submittedAt: true,
      submissionHash: true,
      deadlineAt: true,
      reachedPosition: true,
      exam: { select: { id: true, title: true, instructions: true, allowBackNavigation: true, monitoring: true } },
      questions: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          marks: true,
          optionOrder: true,
          questionVersion: {
            select: { text: true, options: true, maxLength: true, question: { select: { type: true } } },
          },
          answer: { select: { response: true, markedForReview: true, revision: true, savedAt: true } },
        },
      },
    },
  })

  const running = attempt.status === 'IN_PROGRESS'
  const { monitoring, ...exam } = attempt.exam
  return {
    id: attempt.id,
    isSandbox: current.isSandbox,
    preferences: await getPreferences(actor.id),
    status: attempt.status,
    submitReason: attempt.submitReason,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    receipt: attempt.submissionHash,
    deadlineAt: attempt.deadlineAt.toISOString(),
    serverNow: serverNow().toISOString(),
    exam,
    monitoring: readSettings(monitoring),
    announcements: running ? await announcementsFor(actor.id, exam.id) : [],
    reachedPosition: attempt.reachedPosition,
    // Questions are shown only while the attempt is running
    questions: running
      ? attempt.questions.map((q) =>
          candidateQuestion(q, !attempt.exam.allowBackNavigation && q.position !== attempt.reachedPosition)
        )
      : [],
  }
}

/** Small and cheap, for the browser to re-synchronise its countdown. */
export async function attemptClock(actor: Actor, attemptId: number, sessionId?: string) {
  const attempt = await currentAttempt(actor, attemptId)
  const running = attempt.status === 'IN_PROGRESS'
  const activeSession = sessionId === undefined || sessionId === attempt.activeSessionId
  // Only the screen that holds the attempt counts as the candidate being connected
  if (running && activeSession) await noteContact(attemptId)
  return {
    announcements: running ? await announcementsFor(actor.id, attempt.examId) : [],
    status: attempt.status,
    serverNow: serverNow().toISOString(),
    deadlineAt: attempt.deadlineAt.toISOString(),
    // False once another browser has taken over: the screen turns read only
    activeSession,
  }
}

/** Moves to the next question when going back is not allowed. Only one step forward at a time. */
export async function advanceAttempt(actor: Actor, attemptId: number, sessionId: string, position: number) {
  const attempt = await currentAttempt(actor, attemptId)
  if (attempt.status !== 'IN_PROGRESS') throw new ApiError('CONFLICT', ENDED)
  if (attempt.activeSessionId !== sessionId) throw new ApiError('CONFLICT', ELSEWHERE)

  await noteContact(attemptId)
  const total = await prisma.attemptQuestion.count({ where: { attemptId } })
  if (position <= total) {
    // Conditional on being exactly one behind, so a repeat or a skip changes nothing
    await prisma.attempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS', activeSessionId: sessionId, reachedPosition: position - 1 },
      data: { reachedPosition: position, lastSeenAt: serverNow() },
    })
  }
  return viewAttempt(actor, attemptId)
}

// ---------- writing ----------

const ENDED = 'This attempt has ended. Answers sent now are not accepted.'
const ELSEWHERE = 'This attempt is open somewhere else. Reload to continue here.'

export async function saveAnswer(actor: Actor, attemptId: number, attemptQuestionId: number, input: SaveAnswerInput) {
  rateLimit(`save:${actor.id}`, 180, 60_000)
  const attempt = await ownAttempt(actor, attemptId)
  if (attempt.status !== 'IN_PROGRESS' || isPastDeadline(attempt.deadlineAt)) {
    if (isPastDeadline(attempt.deadlineAt)) await recordIncident(attemptId, 'LATE_SAVE_REJECTED')
    await finalizeAttempt(attemptId, 'TIME_EXPIRED').catch(() => false)
    throw new ApiError('CONFLICT', ENDED)
  }

  // Measured before the save refreshes the contact time
  if (attempt.activeSessionId === input.sessionId) await noteContact(attemptId)

  return prisma.$transaction(async (tx) => {
    const now = serverNow()
    // Claims the attempt row: fails if it ended, expired or moved to another session meanwhile
    const { count } = await tx.attempt.updateMany({
      where: {
        id: attemptId,
        status: 'IN_PROGRESS',
        activeSessionId: input.sessionId,
        deadlineAt: { gte: new Date(now.getTime() - GRACE_MS) },
      },
      data: { lastSeenAt: now },
    })
    if (count === 0) throw new ApiError('CONFLICT', attempt.activeSessionId === input.sessionId ? ENDED : ELSEWHERE)

    const item = await tx.attemptQuestion.findFirst({
      where: { id: attemptQuestionId, attemptId },
      include: { answer: true, questionVersion: { select: { maxLength: true, question: { select: { type: true } } } } },
    })
    if (!item) throw new ApiError('NOT_FOUND', 'Not found')

    const { reachedPosition, exam } = await tx.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      select: { reachedPosition: true, exam: { select: { allowBackNavigation: true } } },
    })
    if (!exam.allowBackNavigation && item.position !== reachedPosition) {
      throw new ApiError('FORBIDDEN', 'Only the current question can be answered in this examination')
    }

    // An older save that arrives late must not overwrite a newer one
    if (item.answer && input.revision <= item.answer.revision) {
      return { saved: false, revision: item.answer.revision, savedAt: item.answer.savedAt.toISOString() }
    }

    const response = checkResponse(input.response, item.questionVersion, item.optionOrder as string[])
    const data = {
      response: response ?? Prisma.DbNull,
      markedForReview: input.markedForReview,
      revision: input.revision,
      savedAt: now,
    }
    await tx.answer.upsert({ where: { attemptQuestionId }, create: { attemptQuestionId, ...data }, update: data })
    return { saved: true, revision: input.revision, savedAt: now.toISOString() }
  })
}

function checkResponse(
  response: SaveAnswerInput['response'],
  version: { maxLength: number | null; question: { type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN' } },
  optionOrder: string[]
) {
  if (response === null) return null
  const invalid = (message: string) => new ApiError('BAD_REQUEST', message)
  const { type } = version.question

  if (type === 'WRITTEN') {
    if (!('text' in response)) throw invalid('This question takes a written answer')
    const limit = version.maxLength ?? MAX_WRITTEN
    if (response.text.length > limit) throw invalid(`The answer is longer than ${limit} characters`)
    return { text: response.text }
  }

  if (!('optionKeys' in response)) throw invalid('Choose from the options')
  const keys = [...new Set(response.optionKeys)]
  if (type === 'SINGLE_CHOICE' && keys.length > 1) throw invalid('Choose one option')
  const optionIds = toOptionIds(optionOrder, keys)
  if (!optionIds) throw invalid('That option is not part of this question')
  return { optionIds }
}

/** Submitting twice returns the same result. The reason is decided by the server clock. */
export async function submitAttempt(actor: Actor, attemptId: number, sessionId: string) {
  const attempt = await currentAttempt(actor, attemptId)
  if (attempt.status === 'IN_PROGRESS') {
    const expired = serverNow() >= attempt.deadlineAt
    if (!expired && attempt.activeSessionId !== sessionId) throw new ApiError('CONFLICT', ELSEWHERE)
    if (await finalizeAttempt(attemptId, expired ? 'TIME_EXPIRED' : 'MANUAL')) {
      await audit(prisma, actor.id, 'attempt_submitted', 'attempt', attemptId)
    }
  }
  return viewAttempt(actor, attemptId)
}
