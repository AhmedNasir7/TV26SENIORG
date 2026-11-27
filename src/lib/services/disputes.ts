/**
 * Disputes: a candidate challenges one marked question of their own published result; the examiner
 * answers with a reason and may correct the mark. Every step is recorded, and any report issued before
 * a correction shows as superseded.
 */
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { recomputeTotal } from '@/lib/services/scoring'

export const DISPUTE_DAYS = 7

export async function raiseDispute(actor: Actor, examId: number, attemptQuestionId: number, reason: string) {
  const item = await prisma.attemptQuestion.findFirst({
    where: { id: attemptQuestionId, attempt: { examId, candidateId: actor.id, isSandbox: false } },
    select: { attemptId: true, attempt: { select: { exam: { select: { resultsPublishedAt: true, ownerId: true, title: true } } } } },
  })
  const found = ensureFound(item, (i) => i.attempt.exam.resultsPublishedAt !== null)
  const { resultsPublishedAt, ownerId, title } = found.attempt.exam
  if (serverNow().getTime() - resultsPublishedAt!.getTime() > DISPUTE_DAYS * 86_400_000) {
    throw new ApiError('CONFLICT', `Disputes close ${DISPUTE_DAYS} days after publication`)
  }
  // One dispute per question: the unique constraint turns a second one into a 409
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({ data: { attemptId: found.attemptId, attemptQuestionId, reason }, select: { id: true } })
    await tx.notification.create({
      data: { userId: ownerId, title: 'Result disputed', message: `A candidate disputed a mark in "${title}".`, type: 'dispute', entityType: 'exam', entityId: examId },
    })
    await audit(tx, actor.id, 'dispute_raised', 'attempt', found.attemptId, { examId, attemptQuestionId })
    return dispute
  })
}

const present = (d: { id: number; attemptId: number; attemptQuestionId: number; reason: string; status: string; response: string | null; createdAt: Date; resolvedAt: Date | null }) => ({
  ...d,
  createdAt: d.createdAt.toISOString(),
  resolvedAt: d.resolvedAt?.toISOString() ?? null,
})

/** The candidate's own disputes for one examination. */
export async function ownDisputes(candidateId: number, examId: number) {
  const rows = await prisma.dispute.findMany({ where: { attempt: { examId, candidateId } }, orderBy: { id: 'asc' } })
  return rows.map(present)
}

export async function examDisputes(actor: Actor, examId: number) {
  ensureFound(await prisma.exam.findUnique({ where: { id: examId }, select: { ownerId: true } }), (e) => canManageExam(actor, e))
  const rows = await prisma.dispute.findMany({
    where: { attempt: { examId } },
    orderBy: [{ status: 'asc' }, { id: 'desc' }],
    include: { attempt: { select: { candidate: { select: { name: true, email: true } } } } },
  })
  const questions = await prisma.attemptQuestion.findMany({
    where: { id: { in: rows.map((r) => r.attemptQuestionId) } },
    select: { id: true, marks: true, answer: { select: { autoMarks: true, manualMarks: true } }, questionVersion: { select: { text: true } } },
  })
  const byId = new Map(questions.map((q) => [q.id, q]))
  return rows.map(({ attempt, ...row }) => {
    const q = byId.get(row.attemptQuestionId)
    const marks = q?.answer?.manualMarks ?? q?.answer?.autoMarks
    return {
      ...present(row),
      candidate: attempt.candidate.name || attempt.candidate.email,
      question: q?.questionVersion.text ?? '',
      maximum: Number(q?.marks ?? 0),
      marks: marks == null ? null : Number(marks),
    }
  })
}

export async function resolveDispute(actor: Actor, examId: number, disputeId: number, input: { accept: boolean; response: string; marks?: number }) {
  return prisma.$transaction(
    async (tx) => {
      const dispute = await tx.dispute.findFirst({
        where: { id: disputeId, attempt: { examId } },
        include: { attempt: { select: { candidateId: true, exam: { select: { ownerId: true, title: true } } } } },
      })
      const found = ensureFound(dispute, (d) => canManageExam(actor, d.attempt.exam))
      if (found.status !== 'OPEN') throw new ApiError('CONFLICT', 'This dispute was already answered')

      let change: { from: number | null; to: number } | null = null
      if (input.accept && input.marks !== undefined) {
        const item = await tx.attemptQuestion.findUniqueOrThrow({ where: { id: found.attemptQuestionId }, include: { answer: true } })
        if (input.marks > Number(item.marks)) throw new ApiError('BAD_REQUEST', `Marks cannot exceed ${Number(item.marks)}`)
        const before = item.answer?.manualMarks ?? item.answer?.autoMarks
        await tx.answer.update({
          where: { attemptQuestionId: item.id },
          data: { manualMarks: input.marks, gradedById: actor.id, gradedAt: serverNow(), gradeVersion: { increment: 1 } },
        })
        await recomputeTotal(tx, found.attemptId)
        change = { from: before == null ? null : Number(before), to: input.marks }
      }
      await tx.dispute.update({
        where: { id: disputeId },
        data: { status: input.accept ? 'ACCEPTED' : 'REJECTED', response: input.response, resolvedById: actor.id, resolvedAt: serverNow() },
      })
      await tx.notification.create({
        data: { userId: found.attempt.candidateId, title: 'Dispute answered', message: `Your dispute in "${found.attempt.exam.title}" was ${input.accept ? 'accepted' : 'declined'}.`, type: 'dispute', entityType: 'exam', entityId: examId },
      })
      await audit(tx, actor.id, 'dispute_resolved', 'attempt', found.attemptId, { examId, disputeId, accepted: input.accept, change })
      return { id: disputeId }
    },
    { isolationLevel: 'Serializable' }
  )
}
