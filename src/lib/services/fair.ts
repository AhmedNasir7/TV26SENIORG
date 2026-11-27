/** Fair randomized papers: the question pool, the recipe, evidence and the draw for one candidate. */
import type { Prisma } from '@/generated/prisma/client'
import { blueprintMarks, readBlueprint } from '@/lib/blueprint'
import { difficultyScore, drawBalanced, shortfall, simulate, toCells, cellKey, type PoolItem, type Rule } from '@/lib/fair'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { examPhase } from '@/lib/server/time'
import { seededRandom } from '@/lib/shuffle'
import { audit } from '@/lib/services/audit'

type Client = Prisma.TransactionClient

/** The owner's active questions in their current wording, with observed difficulty and exposure. */
async function loadPool(client: Client, ownerId: number) {
  const questions = await client.question.findMany({
    where: { ownerId, archivedAt: null },
    select: { id: true, topicId: true, difficulty: true, currentVersion: true, versions: { select: { id: true, version: true, options: true } } },
  })
  const history = await client.attemptQuestion.findMany({
    where: { questionVersion: { question: { ownerId } }, attempt: { isSandbox: false } },
    select: {
      marks: true,
      attempt: { select: { gradingState: true } },
      answer: { select: { autoMarks: true, manualMarks: true } },
      questionVersion: { select: { questionId: true } },
    },
  })
  const stats = new Map<number, { uses: number; sittings: number; full: number }>()
  for (const item of history) {
    const entry = stats.get(item.questionVersion.questionId) ?? { uses: 0, sittings: 0, full: 0 }
    entry.uses += 1
    if (item.attempt.gradingState === 'GRADED') {
      entry.sittings += 1
      if (Number(item.answer?.manualMarks ?? item.answer?.autoMarks ?? 0) >= Number(item.marks)) entry.full += 1
    }
    stats.set(item.questionVersion.questionId, entry)
  }
  return questions.map((q) => {
    const version = q.versions.find((v) => v.version === q.currentVersion)!
    const seen = stats.get(q.id)
    return {
      id: q.id,
      cell: cellKey(q.topicId, q.difficulty),
      score: difficultyScore(q.difficulty, seen?.full ?? 0, seen?.sittings ?? 0),
      uses: seen?.uses ?? 0,
      versionId: version.id,
      options: version.options,
    }
  })
}

export async function poolShortfall(client: Client, ownerId: number, rules: Rule[]) {
  return shortfall(toCells(rules), await loadPool(client, ownerId))
}

/** The questions of one candidate's paper, drawn now and then frozen like any other paper. */
export async function drawPaper(client: Client, ownerId: number, rules: Rule[], seed: number) {
  const pool = await loadPool(client, ownerId)
  const cells = toCells(rules)
  if (shortfall(cells, pool).length) throw new ApiError('CONFLICT', 'The question bank no longer covers this examination. Tell your examiner.')
  const byId = new Map(pool.map((p) => [p.id, p]))
  return drawBalanced(cells, pool, seededRandom(seed)).map((pick) => ({
    questionVersionId: byId.get(pick.id)!.versionId,
    options: byId.get(pick.id)!.options,
    marks: pick.marks,
    score: pick.score,
  }))
}

const ownedExam = async (actor: Actor, examId: number) =>
  ensureFound(await prisma.exam.findUnique({ where: { id: examId } }), (exam) => canManageExam(actor, exam))

export async function fairSetup(actor: Actor, examId: number) {
  const exam = await ownedExam(actor, examId)
  const [pool, topics] = await Promise.all([
    loadPool(prisma, exam.ownerId),
    prisma.topic.findMany({ where: { ownerId: exam.ownerId }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  const available: Record<string, number> = {}
  for (const item of pool) available[item.cell] = (available[item.cell] ?? 0) + 1
  return {
    exam: { id: exam.id, title: exam.title, editable: examPhase(exam) === 'DRAFT' },
    rules: readBlueprint(exam.blueprint),
    topics,
    available,
  }
}

export async function fairEvidence(actor: Actor, examId: number, rules: Rule[]) {
  const exam = await ownedExam(actor, examId)
  const pool: PoolItem[] = await loadPool(prisma, exam.ownerId)
  const cells = toCells(rules)
  if (shortfall(cells, pool).length) throw new ApiError('CONFLICT', 'Add more questions: the recipe asks for more than the bank has')
  return simulate(cells, pool, 200, seededRandom(exam.id + 1))
}

/** Switches a draft between a fair recipe and its fixed list. The total follows the recipe. */
export async function saveBlueprint(actor: Actor, examId: number, rules: Rule[] | null) {
  const exam = await ownedExam(actor, examId)
  if (examPhase(exam) !== 'DRAFT') throw new ApiError('CONFLICT', 'Only a draft can change how papers are made')
  const total = rules ? blueprintMarks(rules).reduce((a, b) => a + b, 0) : null
  if (rules) {
    const topics = await prisma.topic.count({ where: { ownerId: exam.ownerId, id: { in: rules.map((r) => r.topicId) } } })
    if (topics !== new Set(rules.map((r) => r.topicId)).size) throw new ApiError('BAD_REQUEST', 'Choose topics from this question bank')
  }
  await prisma.$transaction(async (tx) => {
    await tx.exam.update({
      where: { id: examId },
      data: {
        blueprint: rules ?? [],
        ...(total !== null && { totalMarks: total, ...(exam.passMarks !== null && Number(exam.passMarks) > total && { passMarks: null }) }),
      },
    })
    await audit(tx, actor.id, 'exam_updated', 'exam', examId, { fairRules: rules?.length ?? 0 })
  })
  return { saved: true, totalMarks: total }
}
