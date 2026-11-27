/**
 * Manual marking of written answers. Only the examination's owner (or an administrator) may mark,
 * marks stay within the question's maximum, and published results are locked until withdrawn.
 */
import type { Prisma } from '@/generated/prisma/client'
import { canGrade, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { finalizeExpired } from '@/lib/services/finalize'
import { recomputeTotal } from '@/lib/services/scoring'
import type { GradeInput, GradingQuery } from '@/lib/validation/grading'

const PAGE_SIZE = 10

/** Submitted, real (never sandbox) attempts of one examination. */
const submitted = (examId: number): Prisma.AttemptWhereInput => ({ examId, isSandbox: false, status: 'SUBMITTED' })
const written: Prisma.QuestionVersionWhereInput = { question: { type: 'WRITTEN' } }
const unmarked: Prisma.AnswerWhereInput = { autoMarks: null, manualMarks: null }

export async function gradingQueue(actor: Actor, examId: number, query: GradingQuery) {
  const exam = ensureFound(
    await prisma.exam.findUnique({ where: { id: examId }, select: { id: true, title: true, ownerId: true, resultsPublishedAt: true } }),
    (found) => canGrade(actor, found)
  )
  await finalizeExpired({ examId })

  const { questionVersionId, attemptId, show, page } = query
  const where: Prisma.AttemptQuestionWhereInput = {
    attempt: { ...submitted(examId), ...(attemptId && { id: attemptId }) },
    questionVersion: written,
    ...(questionVersionId && { questionVersionId }),
    ...(show === 'pending' && { answer: { is: unmarked } }),
  }
  const [rows, total, pendingTotal, used] = await Promise.all([
    prisma.attemptQuestion.findMany({
      where,
      // By question first, so answers to the same question are marked together
      orderBy: [{ questionVersionId: 'asc' }, { attemptId: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        attemptId: true,
        position: true,
        marks: true,
        questionVersion: { select: { text: true, guidance: true } },
        attempt: { select: { candidate: { select: { name: true, email: true } } } },
        answer: {
          select: {
            response: true,
            autoMarks: true,
            manualMarks: true,
            feedback: true,
            gradeVersion: true,
            gradedAt: true,
            gradedBy: { select: { name: true, email: true } },
          },
        },
      },
    }),
    prisma.attemptQuestion.count({ where }),
    prisma.attemptQuestion.count({ where: { attempt: submitted(examId), questionVersion: written, answer: { is: unmarked } } }),
    prisma.questionVersion.findMany({
      where: { ...written, attemptQuestions: { some: { attempt: submitted(examId) } } },
      select: { id: true, text: true },
      orderBy: { id: 'asc' },
    }),
  ])

  return {
    exam: { id: exam.id, title: exam.title, locked: exam.resultsPublishedAt !== null },
    questions: used.map((v) => ({ questionVersionId: v.id, text: v.text })),
    answers: rows.map(({ answer, ...row }) => {
      const marks = answer?.manualMarks ?? answer?.autoMarks
      return {
        id: row.id,
        attemptId: row.attemptId,
        position: row.position,
        candidate: row.attempt.candidate.name || row.attempt.candidate.email,
        question: row.questionVersion.text,
        guidance: row.questionVersion.guidance,
        maximum: Number(row.marks),
        response: (answer?.response as { text?: string } | null)?.text ?? '',
        marks: marks == null ? null : Number(marks),
        feedback: answer?.feedback ?? '',
        version: answer?.gradeVersion ?? 0,
        gradedBy: answer?.gradedBy ? answer.gradedBy.name || answer.gradedBy.email : null,
        gradedAt: answer?.gradedAt?.toISOString() ?? null,
      }
    }),
    pendingTotal,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** Saves one mark and re-derives the attempt's total in the same transaction. */
export function gradeAnswer(actor: Actor, examId: number, attemptQuestionId: number, input: GradeInput) {
  return prisma.$transaction(
    async (tx) => {
      const item = await tx.attemptQuestion.findFirst({
        where: { id: attemptQuestionId, attempt: { examId, isSandbox: false } },
        select: {
          marks: true,
          attemptId: true,
          attempt: { select: { status: true, exam: { select: { ownerId: true, resultsPublishedAt: true } } } },
          questionVersion: { select: { question: { select: { type: true } } } },
          answer: { select: { id: true, manualMarks: true, feedback: true } },
        },
      })
      const found = ensureFound(item, (value) => canGrade(actor, value.attempt.exam))

      if (found.attempt.exam.resultsPublishedAt) {
        throw new ApiError('CONFLICT', 'Results are published. Withdraw them before changing marks')
      }
      if (found.attempt.status !== 'SUBMITTED') throw new ApiError('CONFLICT', 'This attempt is still running')
      if (found.questionVersion.question.type !== 'WRITTEN') {
        throw new ApiError('BAD_REQUEST', 'Choice questions are marked automatically')
      }
      const maximum = Number(found.marks)
      if (input.marks > maximum) {
        throw new ApiError('BAD_REQUEST', 'Check the highlighted fields', { marks: `Marks cannot exceed ${maximum}` })
      }
      const answer = found.answer
      if (!answer) throw new ApiError('NOT_FOUND', 'Not found')

      // Conditional on the version the examiner was looking at
      const { count } = await tx.answer.updateMany({
        where: { id: answer.id, gradeVersion: input.expectedVersion },
        data: {
          manualMarks: input.marks,
          feedback: input.feedback || null,
          gradedById: actor.id,
          gradedAt: serverNow(),
          gradeVersion: { increment: 1 },
        },
      })
      if (count === 0) throw new ApiError('CONFLICT', 'Someone else marked this answer. Reload to see their mark')

      const totals = await recomputeTotal(tx, found.attemptId)
      // examId stays first: the results history finds these entries by it
      await audit(tx, actor.id, 'answer_graded', 'attempt', found.attemptId, {
        examId,
        attemptQuestionId,
        from: answer.manualMarks === null ? null : Number(answer.manualMarks),
        to: input.marks,
        feedbackChanged: (answer.feedback ?? '') !== input.feedback,
        total: totals.score,
      })
      return { version: input.expectedVersion + 1, ...totals }
    },
    { isolationLevel: 'Serializable' }
  )
}
