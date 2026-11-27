/**
 * Every candidate of one examination ranked by integrity score, plus one batched AI explanation of
 * the top of the list, produced only when a person asks and saved until the records change.
 */
import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { integrityScore } from '@/lib/integrity'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { askAi } from '@/lib/server/ai'
import { similarity } from '@/lib/similarity'
import { audit } from '@/lib/services/audit'

const MAX_ATTEMPTS = 300
const text = (response: unknown) => (response as { text?: string } | null)?.text ?? ''

export async function integrityBoard(actor: Actor, examId: number) {
  ensureFound(await prisma.exam.findUnique({ where: { id: examId }, select: { ownerId: true } }), (e) => canManageExam(actor, e))

  const attempts = await prisma.attempt.findMany({
    where: { examId, isSandbox: false, status: 'SUBMITTED' },
    orderBy: { id: 'asc' },
    take: MAX_ATTEMPTS,
    select: {
      id: true,
      submitReason: true,
      candidate: { select: { name: true, email: true } },
      incidents: { select: { type: true, occurrences: true } },
      questions: { where: { questionVersion: { question: { type: 'WRITTEN' } } }, select: { questionVersionId: true, answer: { select: { response: true } } } },
    },
  })

  // Written answers grouped by question, so each is compared only with answers to the same question
  const byQuestion = new Map<number, Array<{ attemptId: number; answer: string }>>()
  for (const attempt of attempts) {
    for (const q of attempt.questions) {
      const answer = text(q.answer?.response).trim()
      if (answer.length < 40) continue // short answers match by accident
      byQuestion.set(q.questionVersionId, [...(byQuestion.get(q.questionVersionId) ?? []), { attemptId: attempt.id, answer }])
    }
  }
  const closest = new Map<number, number>()
  for (const group of byQuestion.values()) {
    for (const a of group.slice(0, 60)) {
      for (const b of group.slice(0, 60)) {
        if (a.attemptId === b.attemptId) continue
        closest.set(a.attemptId, Math.max(closest.get(a.attemptId) ?? 0, similarity(a.answer, b.answer)))
      }
    }
  }

  const rows = attempts
    .map((attempt) => ({
      attemptId: attempt.id,
      candidate: attempt.candidate.name || attempt.candidate.email,
      ...integrityScore({ incidents: attempt.incidents, closestOtherAnswer: closest.get(attempt.id) ?? 0, left: attempt.submitReason === 'LEFT' }),
    }))
    .sort((x, y) => y.score - x.score || x.attemptId - y.attemptId)
  return { rows }
}

const explainSchema = z.object({
  overview: z.string().max(800),
  items: z.array(z.object({ attemptId: z.number(), note: z.string().max(400) })).max(10),
})
export type IntegrityExplanation = z.infer<typeof explainSchema> & { createdAt: string; cached: boolean }

/** One request for the ten highest scores, not one per candidate. Names are not sent. */
export async function explainBoard(actor: Actor, examId: number): Promise<IntegrityExplanation> {
  const { rows } = await integrityBoard(actor, examId)
  const top = rows.filter((r) => r.score > 0).slice(0, 10)
  if (!top.length) throw new ApiError('CONFLICT', 'No candidate has a score above zero')

  const facts = top.map(({ attemptId, score, level, reasons }) => ({ attemptId, score, level, reasons }))
  const inputHash = createHash('sha256').update(JSON.stringify(facts)).digest('hex')
  const anchor = top[0].attemptId
  const stored = await prisma.aiReview.findUnique({ where: { attemptId_kind: { attemptId: anchor, kind: 'board' } } })
  if (stored?.inputHash === inputHash) {
    return { ...(stored.content as z.infer<typeof explainSchema>), createdAt: stored.createdAt.toISOString(), cached: true }
  }

  const content = await askAi(actor.id, {
    task: `You help an examiner read an integrity ranking for one online examination. Each item has a deterministic score (0 to 100) and the logged reasons. Indicators are never proof; do not accuse anyone. For each attemptId give one short, plain note: what the pattern suggests, and one innocent explanation. Also give a two-sentence overview.
JSON keys: overview, items (array of { attemptId, note }).`,
    data: facts,
    schema: explainSchema,
    maxTokens: 1200,
  })
  const now = new Date()
  const data = { inputHash, content: content as Prisma.InputJsonValue, createdById: actor.id, createdAt: now }
  await prisma.aiReview.upsert({ where: { attemptId_kind: { attemptId: anchor, kind: 'board' } }, create: { attemptId: anchor, kind: 'board', ...data }, update: data })
  await audit(prisma, actor.id, 'ai_requested', 'attempt', anchor, { kind: 'board' })
  return { ...content, createdAt: now.toISOString(), cached: false }
}
