/** Messages from the examiner. Candidates, including late joiners, see the whole history. */
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { audit } from '@/lib/services/audit'

const present = (a: { id: number; message: string; createdAt: Date }) => ({
  id: a.id,
  message: a.message,
  createdAt: a.createdAt.toISOString(),
})

export type Announcement = ReturnType<typeof present>

/** Call only after confirming this candidate belongs to the examination. */
export async function announcementsFor(candidateId: number, examId: number): Promise<Announcement[]> {
  const rows = await prisma.announcement.findMany({
    where: { examId, OR: [{ recipientId: null }, { recipientId: candidateId }] },
    orderBy: { id: 'desc' },
    take: 50,
    select: { id: true, message: true, createdAt: true },
  })
  return rows.map(present)
}

const ownedExam = async (actor: Actor, examId: number) =>
  ensureFound(
    await prisma.exam.findUnique({ where: { id: examId }, select: { ownerId: true, status: true, title: true } }),
    (exam) => canManageExam(actor, exam)
  )

export async function listAnnouncements(actor: Actor, examId: number) {
  await ownedExam(actor, examId)
  const rows = await prisma.announcement.findMany({
    where: { examId },
    orderBy: { id: 'desc' },
    take: 100,
    select: { id: true, message: true, createdAt: true },
  })
  return rows.map(present)
}

export async function sendAnnouncement(actor: Actor, examId: number, message: string) {
  const exam = await ownedExam(actor, examId)
  if (exam.status !== 'PUBLISHED') throw new ApiError('CONFLICT', 'Publish the examination before sending messages')
  return prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({
      data: { examId, authorId: actor.id, message },
      select: { id: true, message: true, createdAt: true },
    })
    const enrolled = await tx.enrollment.findMany({ where: { examId }, select: { candidateId: true } })
    await tx.notification.createMany({
      data: enrolled.map(({ candidateId }) => ({
        userId: candidateId,
        title: `Announcement: ${exam.title}`.slice(0, 200),
        message,
        type: 'exam_announcement',
        entityType: 'exam',
        entityId: examId,
      })),
    })
    await audit(tx, actor.id, 'announcement_sent', 'exam', examId, { announcementId: created.id })
    return present(created)
  })
}
