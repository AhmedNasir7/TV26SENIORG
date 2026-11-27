/**
 * The examiner sits their own examination as a candidate would. Sandbox attempts belong to the
 * staff member, are excluded from every figure, and can never become a real attempt.
 */
import { randomUUID } from 'node:crypto'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'
import { viewAttempt } from '@/lib/services/attempts'
import { finalizeExpired } from '@/lib/services/finalize'
import { buildPaper, PAPER_QUESTIONS } from '@/lib/services/paper-build'

const ownedExam = async (actor: Actor, examId: number) =>
  ensureFound(
    await prisma.exam.findUnique({ where: { id: examId }, include: { questions: PAPER_QUESTIONS } }),
    (exam) => canManageExam(actor, exam)
  )

const mine = (actor: Actor, examId: number) => ({ examId, candidateId: actor.id, isSandbox: true })

/** Where this staff member's sandbox stands for one examination. */
export async function sandboxStatus(actor: Actor, examId: number) {
  const exam = await ownedExam(actor, examId)
  await finalizeExpired({ candidateId: actor.id, examId })
  const attempt = await prisma.attempt.findFirst({ where: mine(actor, examId), select: { status: true } })
  return {
    exam: { id: exam.id, title: exam.title, durationMinutes: exam.durationMinutes, questions: exam.questions.length },
    state: attempt ? (attempt.status === 'IN_PROGRESS' ? ('running' as const) : ('submitted' as const)) : ('none' as const),
  }
}

/** Always a fresh paper, replacing any earlier trial. Works on drafts and ignores the schedule. */
export async function startSandbox(actor: Actor, examId: number, minutes?: number) {
  const exam = await ownedExam(actor, examId)
  if (!exam.questions.length) throw new ApiError('CONFLICT', 'Add questions before trying the examination')
  const allowed = Math.min(minutes ?? exam.durationMinutes, exam.durationMinutes)
  const now = serverNow()

  const attempt = await prisma.$transaction(async (tx) => {
    await tx.attempt.deleteMany({ where: mine(actor, examId) })
    return tx.attempt.create({
      data: {
        ...mine(actor, examId),
        realSlot: null,
        startedAt: now,
        lastSeenAt: now,
        deadlineAt: new Date(now.getTime() + allowed * 60_000),
        ...buildPaper(exam),
      },
      select: { activeSessionId: true },
    })
  })
  return { sessionId: attempt.activeSessionId }
}

export async function openSandbox(actor: Actor, examId: number, sessionId?: string) {
  await ownedExam(actor, examId)
  await finalizeExpired({ candidateId: actor.id, examId })
  const attempt = await prisma.attempt.findFirst({
    where: mine(actor, examId),
    select: { id: true, status: true, activeSessionId: true },
  })
  if (!attempt) throw new ApiError('CONFLICT', 'Start a sandbox attempt first')

  let active = attempt.activeSessionId
  if (attempt.status === 'IN_PROGRESS' && sessionId !== active) {
    active = randomUUID()
    await prisma.attempt.update({ where: { id: attempt.id }, data: { activeSessionId: active } })
  }
  return { attempt: await viewAttempt(actor, attempt.id), sessionId: active }
}

export async function discardSandbox(actor: Actor, examId: number) {
  await ownedExam(actor, examId)
  const { count } = await prisma.attempt.deleteMany({ where: mine(actor, examId) })
  return { discarded: count }
}
