/** The few facts the examination navigation needs, for the owner or an administrator. */
import type { FlowInput } from '@/lib/exam-flow'
import type { Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { getExam } from '@/lib/services/exams'

export async function examFlow(actor: Actor, examId: number): Promise<FlowInput & { title: string }> {
  const exam = await getExam(actor, examId) // refuses anyone who may not manage it
  const [awaitingMarking, record] = await Promise.all([
    prisma.attempt.count({ where: { examId, isSandbox: false, status: 'SUBMITTED', gradingState: 'PENDING_MANUAL' } }),
    prisma.exam.findUniqueOrThrow({ where: { id: examId }, select: { resultsPublishedAt: true } }),
  ])
  return {
    id: exam.id,
    title: exam.title,
    phase: exam.phase,
    questions: exam.questions,
    enrolled: exam.enrolled,
    blockers: exam.checks.filter((c) => c.blocking && !c.ok).length,
    attempts: exam.attempts,
    awaitingMarking,
    resultsPublished: record.resultsPublishedAt !== null,
  }
}
