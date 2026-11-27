/** The one place an attempt's total and grading state are written, always inside the caller's transaction. */
import type { Prisma } from '@/generated/prisma/client'
import { totalOf } from '@/lib/grading'

const asNumber = (value: Prisma.Decimal | null | undefined) => (value == null ? null : Number(value))

export async function recomputeTotal(tx: Prisma.TransactionClient, attemptId: number) {
  const questions = await tx.attemptQuestion.findMany({
    where: { attemptId },
    select: { answer: { select: { autoMarks: true, manualMarks: true } } },
  })
  const { pending, score } = totalOf(
    questions.map(({ answer }) => ({ autoMarks: asNumber(answer?.autoMarks), manualMarks: asNumber(answer?.manualMarks) }))
  )
  const gradingState = pending ? ('PENDING_MANUAL' as const) : ('GRADED' as const)
  await tx.attempt.update({ where: { id: attemptId }, data: { score, gradingState } })
  return { score, pending, gradingState }
}
