/**
 * The examiner's live view. Only the examination's owner or an administrator may read it, it carries
 * no answer content, and nothing here changes a score.
 */
import { INDICATORS, LOCKED_AFTER_START, readSettings, type MonitoringSettings } from '@/lib/monitoring'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { examPhase, serverNow } from '@/lib/server/time'
import { audit } from '@/lib/services/audit'
import { finalizeExpired } from '@/lib/services/finalize'
import type { MonitorQuery } from '@/lib/validation/monitoring'

const PAGE_SIZE = 25

export type BoardState = 'NOT_STARTED' | 'ACTIVE' | 'DISCONNECTED' | 'SUBMITTED'

const ownedExam = async (actor: Actor, examId: number) =>
  ensureFound(await prisma.exam.findUnique({ where: { id: examId } }), (exam) => canManageExam(actor, exam))

const hasStarted = async (examId: number) => (await prisma.attempt.count({ where: { examId, isSandbox: false } })) > 0

export async function monitorSettings(actor: Actor, examId: number) {
  const exam = await ownedExam(actor, examId)
  return {
    exam: { id: exam.id, title: exam.title, phase: examPhase(exam) },
    settings: readSettings(exam.monitoring),
    recordingLocked: await hasStarted(examId),
  }
}

export async function updateSettings(actor: Actor, examId: number, settings: MonitoringSettings) {
  const exam = await ownedExam(actor, examId)
  const before = readSettings(exam.monitoring)
  const changed = (Object.keys(settings) as Array<keyof MonitoringSettings>).filter((key) => settings[key] !== before[key])
  return prisma.$transaction(
    async (tx) => {
      const started = (await tx.attempt.count({ where: { examId, isSandbox: false } })) > 0
      if (started && changed.some((key) => LOCKED_AFTER_START.includes(key))) {
        throw new ApiError('CONFLICT', 'Candidates have started and were told what is recorded, so those choices are locked')
      }
      await tx.exam.update({ where: { id: examId }, data: { monitoring: settings } })
      await audit(tx, actor.id, 'monitoring_updated', 'exam', examId, {
        changes: Object.fromEntries(changed.map((key) => [key, settings[key]])),
      })
      return { settings, recordingLocked: started }
    },
    { isolationLevel: 'Serializable' }
  )
}

async function answeredCounts(attemptIds: number[]) {
  const rows = await prisma.attemptQuestion.findMany({
    where: { attemptId: { in: attemptIds } },
    select: { attemptId: true, answer: { select: { response: true } } },
  })
  const counts = new Map<number, { answered: number; total: number }>()
  for (const { attemptId, answer } of rows) {
    const entry = counts.get(attemptId) ?? { answered: 0, total: 0 }
    const response = answer?.response as { optionIds?: string[]; text?: string } | null | undefined
    entry.total += 1
    if (response?.optionIds?.length || response?.text?.trim()) entry.answered += 1
    counts.set(attemptId, entry)
  }
  return counts
}

export async function monitorBoard(actor: Actor, examId: number, { search, state, page }: MonitorQuery) {
  const exam = await ownedExam(actor, examId)
  await finalizeExpired({ examId })
  const settings = readSettings(exam.monitoring)
  const now = serverNow()

  // Three queries for the whole examination, then details for the visible page only
  const [enrollments, attempts, incidents] = await Promise.all([
    prisma.enrollment.findMany({
      where: { examId },
      orderBy: { candidate: { email: 'asc' } },
      select: { candidate: { select: { id: true, name: true, email: true } } },
    }),
    prisma.attempt.findMany({
      where: { examId, isSandbox: false },
      select: { id: true, candidateId: true, status: true, lastSeenAt: true, deadlineAt: true },
    }),
    prisma.incident.groupBy({
      by: ['attemptId'],
      where: { attempt: { examId, isSandbox: false }, reviewedAt: null },
      _sum: { occurrences: true },
    }),
  ])
  const byCandidate = new Map(attempts.map((a) => [a.candidateId, a]))
  const unreviewed = new Map(incidents.map((i) => [i.attemptId, i._sum.occurrences ?? 0]))

  const everyone = enrollments.map(({ candidate }) => {
    const attempt = byCandidate.get(candidate.id)
    const silent = attempt ? now.getTime() - attempt.lastSeenAt.getTime() > settings.disconnectedAfterSeconds * 1000 : false
    const current: BoardState = !attempt
      ? 'NOT_STARTED'
      : attempt.status === 'SUBMITTED'
        ? 'SUBMITTED'
        : silent
          ? 'DISCONNECTED'
          : 'ACTIVE'
    const indicators = attempt ? (unreviewed.get(attempt.id) ?? 0) : 0
    return {
      candidateId: candidate.id,
      name: candidate.name,
      email: candidate.email,
      state: current,
      attemptId: attempt?.id ?? null,
      lastSeenAt: attempt?.lastSeenAt.toISOString() ?? null,
      secondsLeft:
        attempt?.status === 'IN_PROGRESS' ? Math.max(0, Math.round((attempt.deadlineAt.getTime() - now.getTime()) / 1000)) : null,
      indicators,
      flagged: indicators >= settings.flagAfter,
    }
  })

  const needle = search?.toLowerCase()
  const matching = everyone.filter(
    (row) =>
      (!needle || row.email.toLowerCase().includes(needle) || row.name?.toLowerCase().includes(needle)) &&
      (!state || (state === 'FLAGGED' ? row.flagged : row.state === state))
  )
  const visible = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const progress = await answeredCounts(visible.flatMap((row) => (row.attemptId ? [row.attemptId] : [])))
  const count = (value: BoardState) => everyone.filter((row) => row.state === value).length

  return {
    serverNow: now.toISOString(),
    phase: examPhase(exam, now),
    totals: {
      enrolled: everyone.length,
      notStarted: count('NOT_STARTED'),
      active: count('ACTIVE'),
      disconnected: count('DISCONNECTED'),
      submitted: count('SUBMITTED'),
      flagged: everyone.filter((row) => row.flagged).length,
    },
    rows: visible.map((row) => ({ ...row, ...(progress.get(row.attemptId ?? 0) ?? { answered: 0, total: 0 }) })),
    page,
    totalPages: Math.max(1, Math.ceil(matching.length / PAGE_SIZE)),
  }
}

export type Board = Awaited<ReturnType<typeof monitorBoard>>

export async function attemptTimeline(actor: Actor, examId: number, attemptId: number) {
  await ownedExam(actor, examId)
  const attempt = ensureFound(
    await prisma.attempt.findFirst({
      where: { id: attemptId, examId, isSandbox: false },
      select: {
        candidate: { select: { name: true, email: true } },
        incidents: {
          orderBy: { lastAt: 'desc' },
          include: { reviewedBy: { select: { name: true, email: true } } },
        },
      },
    }),
    () => true
  )
  return {
    candidate: attempt.candidate.name || attempt.candidate.email,
    incidents: attempt.incidents.map((i) => ({
      id: i.id,
      label: INDICATORS[i.type].label,
      source: INDICATORS[i.type].source,
      innocent: INDICATORS[i.type].innocent,
      occurrences: i.occurrences,
      firstAt: i.firstAt.toISOString(),
      lastAt: i.lastAt.toISOString(),
      details: (i.details ?? {}) as { totalSeconds?: number; longestSeconds?: number; totalCharacters?: number },
      reviewedAt: i.reviewedAt?.toISOString() ?? null,
      reviewedBy: i.reviewedBy ? i.reviewedBy.name || i.reviewedBy.email : null,
      note: i.reviewNote,
    })),
  }
}

export type Timeline = Awaited<ReturnType<typeof attemptTimeline>>

export async function reviewIncident(actor: Actor, examId: number, incidentId: number, note: string) {
  await ownedExam(actor, examId)
  return prisma.$transaction(async (tx) => {
    const incident = await tx.incident.findFirst({
      where: { id: incidentId, attempt: { examId, isSandbox: false } },
      select: { id: true, attemptId: true },
    })
    if (!incident) throw new ApiError('NOT_FOUND', 'Not found')
    const { count } = await tx.incident.updateMany({
      where: { id: incidentId, reviewedAt: null },
      data: { reviewedAt: serverNow(), reviewedById: actor.id, reviewNote: note || null },
    })
    if (count === 0) throw new ApiError('CONFLICT', 'This indicator was already reviewed')
    await audit(tx, actor.id, 'incident_reviewed', 'attempt', incident.attemptId, { examId, incidentId })
    return { id: incidentId }
  })
}
