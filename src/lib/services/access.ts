/**
 * The one gate for candidates. Pages, and later the attempt, save and submit routes, ask here,
 * so "may this candidate enter now?" has a single answer based on the server clock.
 */
import { canAttemptExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'

export type AccessState = 'upcoming' | 'available' | 'in_progress' | 'submitted' | 'closed'

type Window = { startsAt: Date; endsAt: Date; durationMinutes: number }

/** The earlier of "start + duration" and the end of the window, both extended by any extra time. */
export function attemptDeadline(startedAt: Date, exam: Window, extraMinutes: number) {
  const extra = extraMinutes * 60_000
  return new Date(Math.min(startedAt.getTime() + exam.durationMinutes * 60_000 + extra, exam.endsAt.getTime() + extra))
}

export function candidateAccess(
  exam: Window,
  extraMinutes: number,
  attempt: { status: 'IN_PROGRESS' | 'SUBMITTED'; deadlineAt: Date } | null,
  now: Date = serverNow()
): { state: AccessState; canEnter: boolean; reason: string; closesAt: Date } {
  const closesAt = new Date(exam.endsAt.getTime() + extraMinutes * 60_000)
  const answer = (state: AccessState, canEnter: boolean, reason: string) => ({ state, canEnter, reason, closesAt })

  if (attempt?.status === 'SUBMITTED') return answer('submitted', false, 'You have submitted this examination')
  if (attempt) {
    return now < attempt.deadlineAt
      ? answer('in_progress', true, 'Your attempt is running')
      : answer('closed', false, 'Your time has ended')
  }
  if (now < exam.startsAt) return answer('upcoming', false, 'Not open yet')
  if (now >= closesAt) return answer('closed', false, 'The examination has closed')
  return answer('available', true, 'Open now')
}

// What a candidate may know before starting: never questions, answers or other candidates
const EXAM_FIELDS = {
  id: true,
  title: true,
  instructions: true,
  startsAt: true,
  endsAt: true,
  durationMinutes: true,
  totalMarks: true,
  passMarks: true,
  allowBackNavigation: true,
  _count: { select: { questions: true } },
} as const

async function loadEnrollments(candidateId: number, examId?: number) {
  return prisma.enrollment.findMany({
    // Drafts don't exist as far as candidates are concerned
    where: { candidateId, examId, exam: { status: 'PUBLISHED' } },
    orderBy: { exam: { startsAt: 'asc' } },
    select: {
      extraMinutes: true,
      exam: {
        select: {
          ...EXAM_FIELDS,
          attempts: {
            where: { candidateId, isSandbox: false },
            select: { status: true, deadlineAt: true },
          },
        },
      },
    },
  })
}

type Row = Awaited<ReturnType<typeof loadEnrollments>>[number]

function present({ extraMinutes, exam }: Row, now: Date) {
  const { attempts, _count, ...details } = exam
  const access = candidateAccess(exam, extraMinutes, attempts[0] ?? null, now)
  return {
    ...details,
    startsAt: exam.startsAt.toISOString(),
    endsAt: exam.endsAt.toISOString(),
    totalMarks: Number(exam.totalMarks),
    passMarks: exam.passMarks === null ? null : Number(exam.passMarks),
    questionCount: _count.questions,
    extraMinutes,
    access: { ...access, closesAt: access.closesAt.toISOString() },
  }
}

export async function listCandidateExams(actor: Actor) {
  const now = serverNow()
  const exams = (await loadEnrollments(actor.id)).map((row) => present(row, now))
  return { serverNow: now.toISOString(), exams }
}

/** 404 unless this candidate is enrolled in a published examination with this id. */
export async function getCandidateExam(actor: Actor, examId: number) {
  const now = serverNow()
  const [row] = await loadEnrollments(actor.id, examId)
  const found = ensureFound(row, () => canAttemptExam(actor, true))
  return { serverNow: now.toISOString(), exam: present(found, now) }
}
