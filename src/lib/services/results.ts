/**
 * The examiner's view of results and their publication. Every figure comes from one query of real
 * attempts, so sandbox runs can never reach statistics or candidates.
 */
import type { Prisma } from '@/generated/prisma/client'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { examPhase, serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { finalizeExpired } from '@/lib/services/finalize'
import { resultHistory } from '@/lib/services/result-history'
import { distribution, passRate, summarize } from '@/lib/stats'
import type { ResultsPublishInput } from '@/lib/validation/grading'

type Client = Prisma.TransactionClient

const realAttempts = (client: Client, examId: number) =>
  client.attempt.findMany({
    where: { examId, isSandbox: false },
    orderBy: [{ candidate: { email: 'asc' } }],
    select: {
      id: true,
      candidateId: true,
      status: true,
      submitReason: true,
      gradingState: true,
      score: true,
      maxScore: true,
      submittedAt: true,
      candidate: { select: { name: true, email: true } },
    },
  })

async function loadExam(client: Client, actor: Actor, examId: number) {
  return ensureFound(
    await client.exam.findUnique({
      where: { id: examId },
      include: { enrollments: { select: { candidateId: true, extraMinutes: true } } },
    }),
    (exam) => canManageExam(actor, exam)
  )
}

type LoadedExam = Awaited<ReturnType<typeof loadExam>>
type Rows = Awaited<ReturnType<typeof realAttempts>>

/** What must be true before candidates may see results. */
function publicationChecks(exam: LoadedExam, attempts: Rows, now: Date) {
  const started = new Set(attempts.map((a) => a.candidateId))
  // Someone with extra time who hasn't started can still sit the examination after it closes
  const longestWait = Math.max(0, ...exam.enrollments.filter((e) => !started.has(e.candidateId)).map((e) => e.extraMinutes))
  const closed = examPhase(exam, now) === 'COMPLETED' && now.getTime() >= exam.endsAt.getTime() + longestWait * 60_000
  const running = attempts.filter((a) => a.status === 'IN_PROGRESS').length
  const pending = attempts.filter((a) => a.status === 'SUBMITTED' && a.gradingState !== 'GRADED').length
  return [
    { label: 'The examination has closed for every candidate', ok: closed },
    { label: running ? `No attempt still running (${running} running)` : 'No attempt is still running', ok: running === 0 },
    { label: pending ? `Every attempt marked (${pending} waiting)` : 'Every submitted attempt is marked', ok: pending === 0 },
    { label: 'At least one attempt was submitted', ok: attempts.some((a) => a.status === 'SUBMITTED') },
  ]
}

/** Average share of the available marks per topic, over fully marked attempts. */
async function topicPerformance(examId: number) {
  const items = await prisma.attemptQuestion.findMany({
    where: { attempt: { examId, isSandbox: false, status: 'SUBMITTED', gradingState: 'GRADED' } },
    select: {
      marks: true,
      answer: { select: { autoMarks: true, manualMarks: true } },
      questionVersion: { select: { question: { select: { topic: { select: { name: true } } } } } },
    },
  })
  const topics = new Map<string, { awarded: number; available: number; answers: number }>()
  for (const item of items) {
    const name = item.questionVersion.question.topic.name
    const entry = topics.get(name) ?? { awarded: 0, available: 0, answers: 0 }
    entry.awarded += Number(item.answer?.manualMarks ?? item.answer?.autoMarks ?? 0)
    entry.available += Number(item.marks)
    entry.answers += 1
    topics.set(name, entry)
  }
  return [...topics]
    .map(([topic, t]) => ({ topic, answers: t.answers, percent: t.available ? Math.round((t.awarded / t.available) * 1000) / 10 : 0 }))
    .sort((a, b) => a.percent - b.percent)
}

function attemptState(attempt: Rows[number], published: boolean) {
  if (attempt.status === 'IN_PROGRESS') return 'Running'
  if (attempt.gradingState !== 'GRADED') return 'Needs marking'
  return published ? 'Published' : 'Marked'
}

export async function examResults(actor: Actor, examId: number) {
  await loadExam(prisma, actor, examId) // refuse before doing any work
  await finalizeExpired({ examId })
  const exam = await loadExam(prisma, actor, examId)
  const attempts = await realAttempts(prisma, examId)
  const graded = attempts.filter((a) => a.status === 'SUBMITTED' && a.gradingState === 'GRADED')
  const scores = graded.map((a) => Number(a.score))
  const passMarks = exam.passMarks === null ? null : Number(exam.passMarks)
  const enrolled = exam.enrollments.length

  return {
    exam: {
      id: exam.id,
      title: exam.title,
      totalMarks: Number(exam.totalMarks),
      passMarks,
      publishedAt: exam.resultsPublishedAt?.toISOString() ?? null,
    },
    summary: {
      enrolled,
      attempted: attempts.length,
      absent: Math.max(0, enrolled - attempts.length),
      running: attempts.filter((a) => a.status === 'IN_PROGRESS').length,
      awaitingMarking: attempts.filter((a) => a.status === 'SUBMITTED' && a.gradingState !== 'GRADED').length,
      ...summarize(scores),
      passRate: passRate(scores, passMarks),
    },
    distribution: distribution(scores, Number(exam.totalMarks)),
    topics: await topicPerformance(examId),
    attempts: attempts.map((a) => ({
      id: a.id,
      name: a.candidate.name,
      email: a.candidate.email,
      state: attemptState(a, exam.resultsPublishedAt !== null),
      score: a.score === null ? null : Number(a.score),
      maximum: Number(a.maxScore),
      passed: passMarks === null || a.score === null ? null : Number(a.score) >= passMarks,
      timedOut: a.submitReason === 'TIME_EXPIRED',
      submittedAt: a.submittedAt?.toISOString() ?? null,
    })),
    checks: publicationChecks(exam, attempts, serverNow()),
    history: await resultHistory(examId),
  }
}

/** Publishing and withdrawing are both recorded; repeating either changes nothing. */
export async function setResultsPublished(actor: Actor, examId: number, input: ResultsPublishInput) {
  await loadExam(prisma, actor, examId)
  await finalizeExpired({ examId })
  return prisma.$transaction(
    async (tx) => {
      const exam = await loadExam(tx, actor, examId)
      if ((exam.resultsPublishedAt !== null) === input.published) return { published: input.published }

      const attempts = await realAttempts(tx, examId)
      if (input.published) {
        const failed = publicationChecks(exam, attempts, serverNow()).filter((c) => !c.ok)
        if (failed.length) throw new ApiError('CONFLICT', `Cannot publish yet: ${failed.map((c) => c.label).join('; ')}`)
      }
      await tx.exam.update({ where: { id: examId }, data: { resultsPublishedAt: input.published ? serverNow() : null } })
      await tx.notification.createMany({
        data: attempts.map((a) => ({
          userId: a.candidateId,
          title: input.published ? 'Result available' : 'Result withdrawn',
          message: input.published
            ? `Your result for "${exam.title}" is ready.`
            : `The result for "${exam.title}" was withdrawn for review.`,
          type: input.published ? 'results_published' : 'results_unpublished',
          entityType: 'exam',
          entityId: examId,
        })),
      })
      await audit(
        tx,
        actor.id,
        input.published ? 'results_published' : 'results_unpublished',
        'exam',
        examId,
        input.published ? { attempts: attempts.length } : { reason: input.reason }
      )
      return { published: input.published }
    },
    { isolationLevel: 'Serializable' }
  )
}
