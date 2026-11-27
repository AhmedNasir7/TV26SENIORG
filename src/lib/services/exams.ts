/**
 * Examination lifecycle. Stored status is DRAFT or PUBLISHED; ongoing and completed come from the
 * server clock. Drafts are fully editable, published exams that haven't started allow wording
 * changes only, and started or finished exams are locked.
 */
import { Prisma } from '@/generated/prisma/client'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError, parseInput } from '@/lib/server/api'
import { examPhase, serverNow, type ExamPhase } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { finalizeExpired } from '@/lib/services/finalize'
import { publicationChecks } from '@/lib/services/readiness'
import { examSchema, publishedEditSchema } from '@/lib/validation/exams'

type Tx = Prisma.TransactionClient
export const PHASES: ExamPhase[] = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED']

function phaseFilter(phase: ExamPhase, now: Date): Prisma.ExamWhereInput {
  if (phase === 'DRAFT') return { status: 'DRAFT' }
  if (phase === 'PUBLISHED') return { status: 'PUBLISHED', startsAt: { gt: now } }
  if (phase === 'ONGOING') return { status: 'PUBLISHED', startsAt: { lte: now }, endsAt: { gt: now } }
  return { status: 'PUBLISHED', endsAt: { lte: now } }
}

export async function listExams(actor: Actor, phase?: ExamPhase) {
  const now = serverNow()
  const exams = await prisma.exam.findMany({
    where: { ...(actor.role !== 'ADMIN' && { ownerId: actor.id }), ...(phase && phaseFilter(phase, now)) },
    orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
    take: 100,
    include: { _count: { select: { questions: true, enrollments: true } } },
  })
  return exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    phase: examPhase(exam, now),
    startsAt: exam.startsAt.toISOString(),
    endsAt: exam.endsAt.toISOString(),
    durationMinutes: exam.durationMinutes,
    totalMarks: Number(exam.totalMarks),
    questions: exam._count.questions,
    enrolled: exam._count.enrollments,
  }))
}

async function findOwned(client: Tx, actor: Actor, id: number) {
  return ensureFound(
    await client.exam.findUnique({
      where: { id },
      include: {
        questions: { select: { marks: true } },
        _count: { select: { enrollments: true, attempts: { where: { isSandbox: false } } } },
      },
    }),
    (exam) => canManageExam(actor, exam)
  )
}

type OwnedExam = Awaited<ReturnType<typeof findOwned>>

const checksFor = (exam: OwnedExam, now: Date) =>
  publicationChecks({
    startsAt: exam.startsAt,
    endsAt: exam.endsAt,
    durationMinutes: exam.durationMinutes,
    totalMarks: Number(exam.totalMarks),
    questionMarks: exam.questions.map((q) => Number(q.marks)),
    enrolled: exam._count.enrollments,
    now,
  })

/** Everything the review screen needs, including what blocks publication. */
export async function getExam(actor: Actor, id: number) {
  const exam = await findOwned(prisma, actor, id)
  await finalizeExpired({ examId: id })
  const now = serverNow()
  const phase = examPhase(exam, now)
  return {
    id: exam.id,
    title: exam.title,
    instructions: exam.instructions,
    startsAt: exam.startsAt.toISOString(),
    endsAt: exam.endsAt.toISOString(),
    durationMinutes: exam.durationMinutes,
    totalMarks: Number(exam.totalMarks),
    passMarks: exam.passMarks === null ? null : Number(exam.passMarks),
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
    allowBackNavigation: exam.allowBackNavigation,
    phase,
    questions: exam.questions.length,
    enrolled: exam._count.enrollments,
    attempts: exam._count.attempts,
    checks: checksFor(exam, now),
    canEdit: phase === 'DRAFT' ? ('all' as const) : phase === 'PUBLISHED' ? ('wording' as const) : ('none' as const),
    canUnpublish: exam.status === 'PUBLISHED' && exam._count.attempts === 0,
  }
}

const toData = (input: ReturnType<typeof examSchema.parse>) => ({
  ...input,
  startsAt: new Date(input.startsAt),
  endsAt: new Date(input.endsAt),
})

export function createExam(actor: Actor, body: unknown) {
  const input = parseInput(body, examSchema)
  return prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({ data: { ...toData(input), ownerId: actor.id }, select: { id: true } })
    await audit(tx, actor.id, 'exam_created', 'exam', exam.id, { title: input.title })
    return exam
  })
}

/** Which fields are accepted depends on the state, decided here on the server. */
export function updateExam(actor: Actor, id: number, body: unknown) {
  return prisma.$transaction(
    async (tx) => {
      const exam = await findOwned(tx, actor, id)
      const phase = examPhase(exam)
      if (phase === 'ONGOING' || phase === 'COMPLETED') {
        throw new ApiError('CONFLICT', 'This examination has started, so its settings are locked')
      }
      const data = phase === 'DRAFT' ? toData(parseInput(body, examSchema)) : parseInput(body, publishedEditSchema)
      await tx.exam.update({ where: { id }, data })
      await audit(tx, actor.id, 'exam_updated', 'exam', id, { phase })
      return { id }
    },
    { isolationLevel: 'Serializable' }
  )
}

/** Publishing or unpublishing twice is harmless. */
export function setPublished(actor: Actor, id: number, published: boolean) {
  return prisma.$transaction(
    async (tx) => {
      const exam = await findOwned(tx, actor, id)
      if ((exam.status === 'PUBLISHED') === published) return { id, published }

      if (published) {
        const failed = checksFor(exam, serverNow()).filter((check) => check.blocking && !check.ok)
        if (failed.length) {
          throw new ApiError('CONFLICT', `Cannot publish yet: ${failed.map((c) => c.label).join('; ')}`)
        }
      } else if (exam._count.attempts > 0) {
        throw new ApiError('CONFLICT', 'Candidates have already started, so it cannot be unpublished')
      }

      await tx.exam.update({
        where: { id },
        data: { status: published ? 'PUBLISHED' : 'DRAFT', publishedAt: published ? serverNow() : null },
      })

      if (published) {
        const enrolled = await tx.enrollment.findMany({ where: { examId: id }, select: { candidateId: true } })
        await tx.notification.createMany({
          data: enrolled.map(({ candidateId }) => ({
            userId: candidateId,
            title: 'Examination assigned',
            message: `"${exam.title}" is now on your list.`,
            type: 'exam_published',
            entityType: 'exam',
            entityId: id,
          })),
        })
      }
      await audit(tx, actor.id, published ? 'exam_published' : 'exam_unpublished', 'exam', id)
      return { id, published }
    },
    { isolationLevel: 'Serializable' }
  )
}

export function deleteDraft(actor: Actor, id: number) {
  return prisma.$transaction(
    async (tx) => {
      const exam = await findOwned(tx, actor, id)
      if (exam.status !== 'DRAFT') throw new ApiError('CONFLICT', 'Only a draft can be deleted')
      await tx.attempt.deleteMany({ where: { examId: id, isSandbox: true } }) // trial runs are not records
      if ((await tx.attempt.count({ where: { examId: id } })) > 0) {
        throw new ApiError('CONFLICT', 'This examination has attempts, so it is kept')
      }
      await tx.exam.delete({ where: { id } })
      await audit(tx, actor.id, 'exam_deleted', 'exam', id, { title: exam.title })
      return { id }
    },
    { isolationLevel: 'Serializable' }
  )
}

/** A new draft with the same settings and the newest version of each question; no candidates. */
export function duplicateExam(actor: Actor, id: number) {
  return prisma.$transaction(async (tx) => {
    await findOwned(tx, actor, id)
    const source = await tx.exam.findUniqueOrThrow({
      where: { id },
      include: {
        questions: { include: { question: { include: { versions: { select: { id: true, version: true } } } } } },
      },
    })
    const copy = await tx.exam.create({
      data: {
        ownerId: source.ownerId,
        title: `${source.title} (copy)`.slice(0, 200),
        instructions: source.instructions,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        durationMinutes: source.durationMinutes,
        totalMarks: source.totalMarks,
        passMarks: source.passMarks,
        shuffleQuestions: source.shuffleQuestions,
        shuffleOptions: source.shuffleOptions,
        allowBackNavigation: source.allowBackNavigation,
        monitoring: source.monitoring ?? undefined,
        blueprint: source.blueprint ?? undefined,
        questions: {
          create: source.questions.map((item) => ({
            questionId: item.questionId,
            questionVersionId: item.question.versions.find((v) => v.version === item.question.currentVersion)!.id,
            position: item.position,
            marks: item.marks,
          })),
        },
      },
      select: { id: true },
    })
    await audit(tx, actor.id, 'exam_duplicated', 'exam', copy.id, { from: id })
    return copy
  })
}
