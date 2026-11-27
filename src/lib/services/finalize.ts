/**
 * Ending an attempt. One conditional update flips IN_PROGRESS to SUBMITTED, so whoever gets
 * there first (candidate, timer or examiner) grades it exactly once; everyone else does nothing.
 */
import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma/client'
import { gradeChoice, type QuestionOption } from '@/lib/grading'
import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'
import { recomputeTotal } from '@/lib/services/scoring'

/** Allowance for a request that left the browser in time but arrived just after the deadline. */
export const GRACE_MS = 5000

export const isPastDeadline = (deadlineAt: Date, now: Date = serverNow()) =>
  now.getTime() > deadlineAt.getTime() + GRACE_MS

type Reason = 'MANUAL' | 'TIME_EXPIRED' | 'EXAMINER'

export function finalizeAttempt(attemptId: number, reason: Reason) {
  return prisma.$transaction(async (tx) => {
    const now = serverNow()
    // Also locks the row: a save running at the same moment finishes first or is refused
    const { count } = await tx.attempt.updateMany({
      where: { id: attemptId, status: 'IN_PROGRESS' },
      data: { status: 'SUBMITTED', submitReason: reason },
    })
    if (count === 0) return false

    await grade(tx, attemptId, now)
    return true
  })
}

async function grade(tx: Prisma.TransactionClient, attemptId: number, now: Date) {
  const attempt = await tx.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        include: { answer: true, questionVersion: { include: { question: { select: { type: true } } } } },
      },
    },
  })

  for (const item of attempt.questions) {
    const { type } = item.questionVersion.question
    const response = item.answer?.response as { optionIds?: string[]; text?: string } | null | undefined
    let autoMarks: number | null = null

    if (type === 'WRITTEN') {
      // A blank written answer scores zero by itself; anything written needs a person
      if (!response?.text?.trim()) autoMarks = 0
    } else {
      autoMarks = gradeChoice({
        type,
        scoringRule: item.questionVersion.scoringRule,
        options: item.questionVersion.options as unknown as QuestionOption[],
        selected: response?.optionIds ?? [],
        marks: Number(item.marks),
      })
    }
    await tx.answer.upsert({
      where: { attemptQuestionId: item.id },
      create: { attemptQuestionId: item.id, autoMarks },
      update: { autoMarks },
    })
  }

  // Receipt: proves afterwards exactly which answers were submitted
  const receipt = attempt.questions.map((q) => [q.id, q.answer?.response ?? null])
  await tx.attempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: new Date(Math.min(now.getTime(), attempt.deadlineAt.getTime())),
      submissionHash: createHash('sha256').update(JSON.stringify([attemptId, receipt])).digest('hex'),
    },
  })
  await recomputeTotal(tx, attemptId)
}

/**
 * Finishes every running attempt whose time is up. Called whenever someone reads exam data,
 * so a closed browser is still finalized without a scheduler.
 */
export async function finalizeExpired(scope: { examId?: number; candidateId?: number } = {}) {
  const due = await prisma.attempt.findMany({
    where: { ...scope, status: 'IN_PROGRESS', deadlineAt: { lt: new Date(serverNow().getTime() - GRACE_MS) } },
    select: { id: true },
    take: 500,
  })
  let finalized = 0
  for (const { id } of due) {
    if (await finalizeAttempt(id, 'TIME_EXPIRED')) finalized += 1
  }
  return finalized
}
