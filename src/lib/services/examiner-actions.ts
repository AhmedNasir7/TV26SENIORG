/** Deliberate examiner interventions. Each needs a reason and leaves an audit entry. */
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { finalizeAttempt, finalizeExpired } from '@/lib/services/finalize'
import { recomputeTotal } from '@/lib/services/scoring'

const ownedExam = async (actor: Actor, examId: number) =>
  ensureFound(await prisma.exam.findUnique({ where: { id: examId } }), (exam) => canManageExam(actor, exam))

/** A faulty question gives full marks to everyone who received it, before results are published. */
export async function voidQuestion(actor: Actor, examId: number, questionVersionId: number, reason: string) {
  const exam = await ownedExam(actor, examId)
  if (exam.resultsPublishedAt) throw new ApiError('CONFLICT', 'Withdraw the results before voiding a question')
  await finalizeExpired({ examId })
  return prisma.$transaction(
    async (tx) => {
      const items = await tx.attemptQuestion.findMany({
        where: { questionVersionId, attempt: { examId, isSandbox: false, status: 'SUBMITTED' } },
        select: { id: true, attemptId: true, marks: true },
      })
      if (!items.length) throw new ApiError('NOT_FOUND', 'Nobody has submitted that question')
      for (const item of items) {
        const mark = {
          manualMarks: item.marks,
          feedback: `Question voided: ${reason}`,
          gradedById: actor.id,
          gradedAt: serverNow(),
        }
        await tx.answer.upsert({
          where: { attemptQuestionId: item.id },
          create: { attemptQuestionId: item.id, ...mark },
          update: { ...mark, gradeVersion: { increment: 1 } },
        })
        await recomputeTotal(tx, item.attemptId)
      }
      await audit(tx, actor.id, 'question_voided', 'exam', examId, { questionVersionId, reason, affected: items.length })
      return { affected: items.length }
    },
    { timeout: 60_000 }
  )
}

export async function forceSubmit(actor: Actor, examId: number, attemptId: number, reason: string) {
  await ownedExam(actor, examId)
  const attempt = await prisma.attempt.findFirst({ where: { id: attemptId, examId, isSandbox: false }, select: { candidateId: true } })
  if (!attempt) throw new ApiError('NOT_FOUND', 'Not found')
  if (!(await finalizeAttempt(attemptId, 'EXAMINER'))) throw new ApiError('CONFLICT', 'This attempt has already ended')
  await prisma.$transaction(async (tx) => {
    await tx.notification.create({
      data: { userId: attempt.candidateId, title: 'Attempt submitted by your examiner', message: reason, type: 'force_submit', entityType: 'exam', entityId: examId },
    })
    await audit(tx, actor.id, 'attempt_force_submitted', 'attempt', attemptId, { examId, reason })
  })
  return { submitted: true }
}
