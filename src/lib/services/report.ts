/**
 * One marked paper. Staff see it with correct answers; a candidate sees only their own, only after
 * publication, and without the answer key or marking notes.
 */
import type { QuestionOption } from '@/lib/grading'
import { canManageExam, canViewResult, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { finalizeExpired } from '@/lib/services/finalize'

async function buildReport(attemptId: number, forStaff: boolean, revealToCandidate = false) {
  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      exam: { select: { id: true, title: true, passMarks: true, resultsPublishedAt: true, revealAnswers: true } },
      candidate: { select: { name: true, email: true } },
      questions: {
        orderBy: { position: 'asc' },
        include: { answer: true, questionVersion: { include: { question: { select: { type: true } } } } },
      },
    },
  })
  const passMarks = attempt.exam.passMarks === null ? null : Number(attempt.exam.passMarks)
  const score = attempt.score === null ? null : Number(attempt.score)

  return {
    attemptId: attempt.id,
    exam: { id: attempt.exam.id, title: attempt.exam.title },
    candidate: attempt.candidate.name || attempt.candidate.email,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    timedOut: attempt.submitReason === 'TIME_EXPIRED',
    receipt: attempt.submissionHash,
    publishedAt: attempt.exam.resultsPublishedAt?.toISOString() ?? null,
    score,
    maximum: Number(attempt.maxScore),
    passMarks,
    passed: score === null || passMarks === null ? null : score >= passMarks,
    questions: attempt.questions.map((item) => {
      const response = item.answer?.response as { optionIds?: string[]; text?: string } | null | undefined
      const chosen = new Set(response?.optionIds ?? [])
      const options = new Map((item.questionVersion.options as unknown as QuestionOption[]).map((o) => [o.id, o]))
      const marks = item.answer?.manualMarks ?? item.answer?.autoMarks
      return {
        id: item.id,
        position: item.position,
        type: item.questionVersion.question.type,
        text: item.questionVersion.text,
        maximum: Number(item.marks),
        marks: marks == null ? null : Number(marks),
        feedback: item.answer?.feedback ?? null,
        written: response?.text ?? null,
        // In the order this candidate saw them
        options: (item.optionOrder as string[]).map((id) => ({
          text: options.get(id)?.text ?? '',
          chosen: chosen.has(id),
          // The key reaches a candidate only when the examiner chose to reveal it with the results
          correct: forStaff || (revealToCandidate && attempt.exam.revealAnswers) ? Boolean(options.get(id)?.correct) : null,
        })),
        guidance: forStaff ? item.questionVersion.guidance : null,
      }
    }),
  }
}

export type Report = Awaited<ReturnType<typeof buildReport>>

/** A submitted real attempt, for the examination's owner or an administrator. */
export async function staffReport(actor: Actor, examId: number, attemptId: number) {
  const where = { id: attemptId, examId, isSandbox: false }
  const attempt = await prisma.attempt.findFirst({ where, select: { exam: { select: { ownerId: true } } } })
  ensureFound(attempt, (a) => canManageExam(actor, a.exam))
  await finalizeExpired({ examId })
  ensureFound(await prisma.attempt.findFirst({ where: { ...where, status: 'SUBMITTED' }, select: { id: true } }), () => true)
  return buildReport(attemptId, true)
}

/** The marked paper of the staff member's own finished sandbox attempt. */
export async function sandboxReport(actor: Actor, examId: number) {
  const attempt = await prisma.attempt.findFirst({
    where: { examId, candidateId: actor.id, isSandbox: true, status: 'SUBMITTED' },
    select: { id: true, exam: { select: { ownerId: true } } },
  })
  return buildReport(ensureFound(attempt, (a) => canManageExam(actor, a.exam)).id, true)
}

/** The caller's own result. Unpublished, absent and someone else's all look the same: not found. */
export async function candidateResult(actor: Actor, examId: number) {
  const attempt = await prisma.attempt.findFirst({
    where: { examId, candidateId: actor.id, isSandbox: false, status: 'SUBMITTED', gradingState: 'GRADED' },
    select: { id: true, candidateId: true, isSandbox: true, exam: { select: { ownerId: true, resultsPublishedAt: true } } },
  })
  const found = ensureFound(
    attempt,
    (a) => actor.role === 'CANDIDATE' && canViewResult(actor, a, a.exam.resultsPublishedAt !== null)
  )
  return buildReport(found.id, false, true)
}

/** What a candidate's report states, without the answer key. For signing and verification only. */
export const candidateReport = (attemptId: number) => buildReport(attemptId, false)
