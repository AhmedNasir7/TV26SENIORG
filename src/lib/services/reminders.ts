/**
 * Timely reminders, run by the server's timer. Each candidate gets at most one reminder per window per
 * examination, however often this runs. The windows come from REMINDER_MINUTES (default a day and an
 * hour); a candidate may also choose their own time, and an examiner may send a reminder at once.
 */
import { formatDateTime, SERVER_ZONE } from '@/lib/format-date'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { emailUsers } from '@/lib/services/emails'

const MINUTE = 60_000
const BATCH = 60

/** Minutes before the start, ascending. Anything unreadable falls back to the default. */
export function reminderMinutes(raw = process.env.REMINDER_MINUTES): number[] {
  const parsed = (raw ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0 && n <= 10080)
  return [...new Set(parsed.length ? parsed : [60, 1440])].sort((a, b) => a - b)
}

// The first two keep their old names so reminders already recorded are still recognised
const kindFor = (minutes: number) => (minutes === 1440 ? 'day' : minutes === 60 ? 'hour' : `m${minutes}`)

const phrase = (minutes: number) =>
  minutes >= 1440 && minutes % 1440 === 0 ? `in ${minutes / 1440} day${minutes > 1440 ? 's' : ''}` : minutes >= 60 && minutes % 60 === 0 ? `in ${minutes / 60} hour${minutes > 60 ? 's' : ''}` : `in ${minutes} minute${minutes > 1 ? 's' : ''}`

type Due = { examId: number; title: string; startsAt: Date; kind: string; heading: string; candidateIds: number[] }

/** Records who is being reminded first, so two overlapping runs can't both send. */
async function claim(due: Due) {
  const claimed: number[] = []
  for (const candidateId of due.candidateIds.slice(0, BATCH)) {
    try {
      await prisma.reminder.create({ data: { examId: due.examId, candidateId, kind: due.kind } })
      claimed.push(candidateId)
    } catch {
      // another run claimed it
    }
  }
  if (!claimed.length) return { notified: 0, emailed: 0 }
  const message = `"${due.title}" starts at ${formatDateTime(due.startsAt, SERVER_ZONE)}.`
  await prisma.notification.createMany({
    data: claimed.map((userId) => ({ userId, title: due.heading, message, type: 'exam_reminder', entityType: 'exam', entityId: due.examId })),
  })
  return { notified: claimed.length, emailed: await emailUsers(claimed, due.heading, message) }
}

export async function sendReminders() {
  const now = serverNow().getTime()
  let notified = 0
  let emailed = 0
  const add = (result: { notified: number; emailed: number }) => {
    notified += result.notified
    emailed += result.emailed
  }

  // Window n covers starts between the previous window's edge and n minutes away
  let from = 0
  for (const minutes of reminderMinutes()) {
    const kind = kindFor(minutes)
    const exams = await prisma.exam.findMany({
      where: { status: 'PUBLISHED', startsAt: { gt: new Date(now + from * MINUTE), lte: new Date(now + minutes * MINUTE) } },
      select: { id: true, title: true, startsAt: true, enrollments: { select: { candidateId: true } }, reminders: { where: { kind }, select: { candidateId: true } } },
      take: 50,
    })
    from = minutes
    for (const exam of exams) {
      const done = new Set(exam.reminders.map((r) => r.candidateId))
      const candidateIds = exam.enrollments.map((e) => e.candidateId).filter((id) => !done.has(id))
      if (candidateIds.length) add(await claim({ examId: exam.id, title: exam.title, startsAt: exam.startsAt, kind, heading: `Your examination starts ${phrase(minutes)}`, candidateIds }))
    }
  }

  // Each candidate's own chosen time
  const chosen = await prisma.enrollment.findMany({
    where: { reminderMinutes: { not: null }, exam: { status: 'PUBLISHED', startsAt: { gt: new Date(now) } } },
    select: { candidateId: true, reminderMinutes: true, exam: { select: { id: true, title: true, startsAt: true } } },
    take: 500,
  })
  for (const row of chosen) {
    const minutes = row.reminderMinutes as number
    if (row.exam.startsAt.getTime() - now > minutes * MINUTE) continue
    const kind = `own${minutes}`
    add(await claim({ examId: row.exam.id, title: row.exam.title, startsAt: row.exam.startsAt, kind, heading: `Your examination starts ${phrase(minutes)}`, candidateIds: [row.candidateId] }))
  }
  return { notified, emailed }
}

/** The candidate's own choice. Changing it re-arms the reminder for the new time. */
export async function setReminder(candidateId: number, examId: number, minutes: number | null) {
  const enrollment = await prisma.enrollment.findFirst({ where: { examId, candidateId, exam: { status: 'PUBLISHED' } }, select: { id: true } })
  if (!enrollment) throw new ApiError('NOT_FOUND', 'Not found')
  await prisma.$transaction([
    prisma.enrollment.update({ where: { id: enrollment.id }, data: { reminderMinutes: minutes } }),
    prisma.reminder.deleteMany({ where: { examId, candidateId, kind: { startsWith: 'own' } } }),
  ])
  return { minutes }
}

/** "Send reminders now": every enrolled candidate who has not started, at most once a minute per examination. */
export async function sendRemindersNow(actor: Actor, examId: number) {
  const exam = ensureFound(
    await prisma.exam.findUnique({ where: { id: examId }, select: { id: true, ownerId: true, title: true, status: true, startsAt: true, endsAt: true } }),
    (e) => canManageExam(actor, e)
  )
  if (exam.status !== 'PUBLISHED') throw new ApiError('CONFLICT', 'Publish the examination first')
  if (exam.endsAt.getTime() <= serverNow().getTime()) throw new ApiError('CONFLICT', 'This examination has closed')

  const recent = await prisma.reminder.findFirst({ where: { examId, kind: { startsWith: 'manual' }, sentAt: { gt: new Date(Date.now() - MINUTE) } }, select: { id: true } })
  if (recent) throw new ApiError('RATE_LIMITED', 'Reminders were sent a moment ago. Wait a minute.')

  const [enrolled, started] = await Promise.all([
    prisma.enrollment.findMany({ where: { examId }, select: { candidateId: true } }),
    prisma.attempt.findMany({ where: { examId, isSandbox: false }, select: { candidateId: true } }),
  ])
  const begun = new Set(started.map((row) => row.candidateId))
  const people = enrolled.filter((row) => !begun.has(row.candidateId)).slice(0, BATCH)
  const stamp = Date.now()
  const result = await claim({
    examId,
    title: exam.title,
    startsAt: exam.startsAt,
    kind: `manual${stamp}`,
    heading: exam.startsAt.getTime() > serverNow().getTime() ? 'Reminder: your examination is coming up' : 'Reminder: your examination is open',
    candidateIds: people.map((p) => p.candidateId),
  })
  await prisma.$transaction((tx) => audit(tx, actor.id, 'reminders_sent', 'exam', examId, { notified: result.notified, emailed: result.emailed }))
  return result
}
