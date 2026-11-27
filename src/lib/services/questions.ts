/**
 * Question bank. Versions are immutable: an edit adds a version, so papers already given to
 * candidates keep their exact wording and marking. Draft examinations follow the newest version.
 * Responses from here contain answer keys and are for staff only.
 */
import type { Prisma } from '@/generated/prisma/client'
import type { QuestionOption } from '@/lib/grading'
import { canManageQuestion, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { audit } from '@/lib/services/audit'
import type { QuestionInput, QuestionListFilter } from '@/lib/validation/questions'

const PAGE_SIZE = 20
type Tx = Prisma.TransactionClient

const SUMMARY = {
  id: true,
  type: true,
  difficulty: true,
  currentText: true,
  currentVersion: true,
  archivedAt: true,
  ownerId: true,
  topic: { select: { id: true, name: true } },
  versions: { orderBy: { version: 'desc' }, take: 1, select: { marks: true } },
  _count: { select: { examQuestions: true } },
} satisfies Prisma.QuestionSelect

export async function listQuestions(actor: Actor, filter: QuestionListFilter) {
  const where: Prisma.QuestionWhereInput = {
    // Examiners can only ever see their own bank, whatever the query asks for
    ownerId: actor.role === 'ADMIN' ? filter.ownerId : actor.id,
    topicId: filter.topicId,
    type: filter.type,
    difficulty: filter.difficulty,
    archivedAt: filter.archived === 'true' ? { not: null } : null,
    ...(filter.search && { currentText: { contains: filter.search, mode: 'insensitive' } }),
  }
  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      select: SUMMARY,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (filter.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.question.count({ where }),
  ])
  const questions = rows.map(({ versions, _count, currentText, ...row }) => ({
    ...row,
    text: currentText,
    marks: Number(versions[0]?.marks ?? 0),
    usedInExams: _count.examQuestions,
  }))
  return { questions, total, page: filter.page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

async function findOwned(client: Tx, actor: Actor, id: number) {
  return ensureFound(await client.question.findUnique({ where: { id } }), (q) => canManageQuestion(actor, q))
}

export async function getQuestion(actor: Actor, id: number) {
  const question = await findOwned(prisma, actor, id)
  const versions = await prisma.questionVersion.findMany({ where: { questionId: id }, orderBy: { version: 'desc' } })
  const current = versions.find((v) => v.version === question.currentVersion)!

  return {
    id: question.id,
    type: question.type,
    difficulty: question.difficulty,
    topicId: question.topicId,
    version: question.currentVersion,
    archived: question.archivedAt !== null,
    text: current.text,
    marks: Number(current.marks),
    options: current.options as unknown as QuestionOption[],
    scoringRule: current.scoringRule,
    guidance: current.guidance,
    maxLength: current.maxLength,
    history: versions.map((v) => ({ version: v.version, createdAt: v.createdAt, text: v.text })),
  }
}

/** The versioned content of a question, normalised so two inputs can be compared. */
function content(input: QuestionInput) {
  return {
    text: input.text,
    marks: input.marks,
    options:
      input.type === 'WRITTEN'
        ? []
        : input.options.map((o, index) => ({ id: `o${index + 1}`, text: o.text, correct: o.correct })),
    scoringRule: input.type === 'MULTIPLE_CHOICE' ? input.scoringRule : ('ALL_OR_NOTHING' as const),
    guidance: input.type === 'WRITTEN' ? input.guidance || null : null,
    maxLength: input.type === 'WRITTEN' ? (input.maxLength ?? null) : null,
  }
}

async function assertTopic(client: Tx, topicId: number, ownerId: number) {
  const topic = await client.topic.findUnique({ where: { id: topicId }, select: { ownerId: true } })
  if (topic?.ownerId !== ownerId) {
    throw new ApiError('BAD_REQUEST', 'Check the highlighted fields', { topicId: 'Choose a topic from this question bank' })
  }
}

function insert(client: Tx, ownerId: number, input: QuestionInput) {
  return client.question.create({
    data: {
      ownerId,
      topicId: input.topicId,
      type: input.type,
      difficulty: input.difficulty,
      currentText: input.text,
      versions: { create: { version: 1, ...content(input) } },
    },
    select: { id: true },
  })
}

export function createQuestion(actor: Actor, input: QuestionInput) {
  return prisma.$transaction(async (tx) => {
    await assertTopic(tx, input.topicId, actor.id)
    const created = await insert(tx, actor.id, input)
    await audit(tx, actor.id, 'question_created', 'question', created.id, { type: input.type })
    return created
  })
}

export function updateQuestion(actor: Actor, id: number, expectedVersion: number, input: QuestionInput) {
  return prisma.$transaction(async (tx) => {
    const question = await findOwned(tx, actor, id)
    if (input.type !== question.type) throw new ApiError('CONFLICT', 'The question type cannot be changed. Duplicate or create a new one.')
    await assertTopic(tx, input.topicId, question.ownerId)

    const current = await tx.questionVersion.findUniqueOrThrow({
      where: { questionId_version: { questionId: id, version: question.currentVersion } },
    })
    const next = content(input)
    const changed =
      next.text !== current.text ||
      next.marks !== Number(current.marks) ||
      next.scoringRule !== current.scoringRule ||
      next.guidance !== current.guidance ||
      next.maxLength !== current.maxLength ||
      // Compare field by field: JSON columns don't keep key order
      JSON.stringify(next.options.map((o) => [o.text, o.correct])) !==
        JSON.stringify((current.options as unknown as QuestionOption[]).map((o) => [o.text, o.correct]))

    const version = changed ? question.currentVersion + 1 : question.currentVersion

    // Fails if someone saved in the meantime, so one examiner can't silently overwrite another
    const { count } = await tx.question.updateMany({
      where: { id, currentVersion: expectedVersion },
      data: { topicId: input.topicId, difficulty: input.difficulty, currentText: input.text, currentVersion: version },
    })
    if (count === 0) throw new ApiError('CONFLICT', 'This question was changed elsewhere. Reload and try again.')

    if (changed) {
      const created = await tx.questionVersion.create({ data: { questionId: id, version, ...next } })
      await tx.examQuestion.updateMany({
        where: { questionId: id, exam: { status: 'DRAFT' } },
        data: { questionVersionId: created.id },
      })
    }
    await audit(tx, actor.id, 'question_updated', 'question', id, { version, newVersion: changed })
    return { id, version }
  })
}

export function duplicateQuestion(actor: Actor, id: number) {
  return prisma.$transaction(async (tx) => {
    const question = await findOwned(tx, actor, id)
    const current = await tx.questionVersion.findUniqueOrThrow({
      where: { questionId_version: { questionId: id, version: question.currentVersion } },
    })
    const text = `${current.text} (copy)`
    const copy = await tx.question.create({
      data: {
        ownerId: question.ownerId,
        topicId: question.topicId,
        type: question.type,
        difficulty: question.difficulty,
        currentText: text,
        versions: {
          create: {
            version: 1,
            text,
            options: current.options ?? [],
            marks: current.marks,
            scoringRule: current.scoringRule,
            guidance: current.guidance,
            maxLength: current.maxLength,
          },
        },
      },
      select: { id: true },
    })
    await audit(tx, actor.id, 'question_created', 'question', copy.id, { duplicatedFrom: id })
    return copy
  })
}

/** Archived questions are hidden from the bank but stay in every paper that already uses them. */
export function setArchived(actor: Actor, id: number, archived: boolean) {
  return prisma.$transaction(async (tx) => {
    await findOwned(tx, actor, id)
    await tx.question.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } })
    await audit(tx, actor.id, 'question_archived', 'question', id, { archived })
    return { id, archived }
  })
}
