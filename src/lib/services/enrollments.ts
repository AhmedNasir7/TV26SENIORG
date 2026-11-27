/** Who may sit an examination. Only the owner (or an administrator) can change it. */
import type { Prisma } from '@/generated/prisma/client'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { examPhase, serverNow } from '@/lib/server/time'
import { attemptDeadline } from '@/lib/services/access'
import { audit } from '@/lib/services/audit'
import { finalizeExpired } from '@/lib/services/finalize'
import type { ExtraTimeInput, PeopleQuery } from '@/lib/validation/exams'

const PAGE_SIZE = 20

async function ownedExam(client: Prisma.TransactionClient, actor: Actor, examId: number) {
  return ensureFound(await client.exam.findUnique({ where: { id: examId } }), (exam) => canManageExam(actor, exam))
}

const matching = (search?: string): Prisma.UserWhereInput =>
  search
    ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] }
    : {}

export type EnrollmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'

export async function listEnrollments(actor: Actor, examId: number, { search, page }: PeopleQuery) {
  await ownedExam(prisma, actor, examId)
  await finalizeExpired({ examId })
  const where: Prisma.EnrollmentWhereInput = { examId, candidate: matching(search) }
  const [rows, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      orderBy: [{ candidate: { email: 'asc' } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        extraMinutes: true,
        extraReason: true,
        candidate: { select: { id: true, name: true, email: true, status: true } },
      },
    }),
    prisma.enrollment.count({ where }),
  ])
  // One query for the page's attempts, not one per candidate
  const attempts = await prisma.attempt.findMany({
    where: { examId, isSandbox: false, candidateId: { in: rows.map((r) => r.candidate.id) } },
    select: { candidateId: true, status: true, gradingState: true },
  })
  const byCandidate = new Map(attempts.map((a) => [a.candidateId, a]))

  const enrollments = rows.map((row) => {
    const attempt = byCandidate.get(row.candidate.id)
    const status: EnrollmentStatus = !attempt
      ? 'NOT_STARTED'
      : attempt.status === 'IN_PROGRESS'
        ? 'IN_PROGRESS'
        : attempt.gradingState === 'GRADED'
          ? 'GRADED'
          : 'SUBMITTED'
    return { ...row, status }
  })
  return { enrollments, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

/** Active candidate accounts not yet enrolled. Only name and email are shared with examiners. */
export async function searchCandidates(actor: Actor, examId: number, { search, page }: PeopleQuery) {
  await ownedExam(prisma, actor, examId)
  const where: Prisma.UserWhereInput = {
    role: 'CANDIDATE',
    status: 'ACTIVE',
    enrollments: { none: { examId } },
    ...matching(search),
  }
  const [candidates, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { email: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true },
    }),
    prisma.user.count({ where }),
  ])
  return { candidates, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export function enroll(actor: Actor, examId: number, candidateIds: number[]) {
  return prisma.$transaction(async (tx) => {
    const exam = await ownedExam(tx, actor, examId)
    if (examPhase(exam) === 'COMPLETED') throw new ApiError('CONFLICT', 'This examination has finished')

    const ids = [...new Set(candidateIds)]
    const eligible = await tx.user.count({ where: { id: { in: ids }, role: 'CANDIDATE', status: 'ACTIVE' } })
    if (eligible !== ids.length) {
      throw new ApiError('BAD_REQUEST', 'Only active candidate accounts can be enrolled')
    }
    const { count } = await tx.enrollment.createMany({
      data: ids.map((candidateId) => ({ examId, candidateId })),
      skipDuplicates: true,
    })
    if (exam.status === 'PUBLISHED') {
      await tx.notification.createMany({
        data: ids.map((userId) => ({
          userId,
          title: 'Examination assigned',
          message: `"${exam.title}" is now on your list.`,
          type: 'exam_published',
          entityType: 'exam',
          entityId: examId,
        })),
      })
    }
    await audit(tx, actor.id, 'enrollment_added', 'exam', examId, { added: count })
    return { added: count }
  })
}

async function findEnrollment(tx: Prisma.TransactionClient, examId: number, enrollmentId: number) {
  const enrollment = await tx.enrollment.findFirst({ where: { id: enrollmentId, examId } })
  if (!enrollment) throw new ApiError('NOT_FOUND', 'Not found')
  const attempt = await tx.attempt.findFirst({
    where: { examId, candidateId: enrollment.candidateId, isSandbox: false },
  })
  return { enrollment, attempt }
}

export function removeEnrollment(actor: Actor, examId: number, enrollmentId: number) {
  return prisma.$transaction(
    async (tx) => {
      await ownedExam(tx, actor, examId)
      const { enrollment, attempt } = await findEnrollment(tx, examId, enrollmentId)
      if (attempt) throw new ApiError('CONFLICT', 'This candidate has already started, so the record is kept')
      await tx.enrollment.delete({ where: { id: enrollment.id } })
      await audit(tx, actor.id, 'enrollment_removed', 'exam', examId, { candidateId: enrollment.candidateId })
      return { id: enrollment.id }
    },
    { isolationLevel: 'Serializable' }
  )
}

/** Accessibility accommodation: moves the deadline of a running attempt too, and records why. */
export async function setExtraTime(actor: Actor, examId: number, enrollmentId: number, { extraMinutes, reason }: ExtraTimeInput) {
  // An attempt whose time already ran out can't be revived by adding minutes
  await finalizeExpired({ examId })
  return prisma.$transaction(
    async (tx) => {
      const exam = await ownedExam(tx, actor, examId)
      const { enrollment, attempt } = await findEnrollment(tx, examId, enrollmentId)
      if (attempt && attempt.status !== 'IN_PROGRESS') {
        throw new ApiError('CONFLICT', 'This candidate has already submitted')
      }
      if (attempt) {
        const deadlineAt = attemptDeadline(attempt.startedAt, exam, extraMinutes)
        if (deadlineAt <= serverNow()) throw new ApiError('CONFLICT', 'That would end the running attempt immediately')
        await tx.attempt.update({ where: { id: attempt.id }, data: { deadlineAt } })
      }
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { extraMinutes, extraReason: extraMinutes ? reason : null },
      })
      await audit(tx, actor.id, 'extra_time_granted', 'exam', examId, {
        candidateId: enrollment.candidateId,
        from: enrollment.extraMinutes,
        to: extraMinutes,
        reason: reason ?? null,
      })
      return { id: enrollment.id, extraMinutes }
    },
    { isolationLevel: 'Serializable' }
  )
}
