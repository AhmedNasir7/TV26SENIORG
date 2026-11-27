/**
 * Timely reminders, run by the server's timer. Each candidate gets at most one "tomorrow" and one
 * "within the hour" reminder per examination, however often this runs.
 */
import { formatDateTime, SERVER_ZONE } from '@/lib/format-date'
import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'
import { emailUsers } from '@/lib/services/emails'

const HOUR = 3_600_000
const WINDOWS = [
  { kind: 'hour', from: 0, to: HOUR, title: 'Your examination starts within an hour' },
  { kind: 'day', from: HOUR, to: 24 * HOUR, title: 'Your examination is within a day' },
] as const

export async function sendReminders() {
  const now = serverNow().getTime()
  let notified = 0
  let emailed = 0
  for (const window of WINDOWS) {
    const exams = await prisma.exam.findMany({
      where: { status: 'PUBLISHED', startsAt: { gt: new Date(now + window.from), lte: new Date(now + window.to) } },
      select: { id: true, title: true, startsAt: true, enrollments: { select: { candidateId: true } }, reminders: { where: { kind: window.kind }, select: { candidateId: true } } },
      take: 50,
    })
    for (const exam of exams) {
      const done = new Set(exam.reminders.map((r) => r.candidateId))
      const due = exam.enrollments.map((e) => e.candidateId).filter((id) => !done.has(id)).slice(0, 60)
      if (!due.length) continue
      const message = `"${exam.title}" starts at ${formatDateTime(exam.startsAt, SERVER_ZONE)}.`
      // Recorded first: if two runs overlap, the unique rows stop a second send
      const claimed: number[] = []
      for (const candidateId of due) {
        try {
          await prisma.reminder.create({ data: { examId: exam.id, candidateId, kind: window.kind } })
          claimed.push(candidateId)
        } catch {
          // another run claimed it
        }
      }
      await prisma.notification.createMany({
        data: claimed.map((userId) => ({ userId, title: window.title, message, type: 'exam_reminder', entityType: 'exam', entityId: exam.id })),
      })
      notified += claimed.length
      emailed += await emailUsers(claimed, window.title, message)
    }
  }
  return { notified, emailed }
}
