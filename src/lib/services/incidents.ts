/** Indicators for a human to review. Never proof of misconduct, never an automatic penalty. */
import { Prisma, type IncidentType } from '@/generated/prisma/client'
import { INDICATORS, readSettings } from '@/lib/monitoring'
import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'

export type Measure = { seconds?: number; characters?: number }
type Details = { totalSeconds?: number; longestSeconds?: number; totalCharacters?: number }

function addTo(details: Details, { seconds, characters }: Measure): Details {
  return {
    ...(seconds !== undefined || details.totalSeconds !== undefined
      ? {
          totalSeconds: (details.totalSeconds ?? 0) + (seconds ?? 0),
          longestSeconds: Math.max(details.longestSeconds ?? 0, seconds ?? 0),
        }
      : {}),
    ...(characters !== undefined || details.totalCharacters !== undefined
      ? { totalCharacters: (details.totalCharacters ?? 0) + (characters ?? 0) }
      : {}),
  }
}

function store(attemptId: number, type: IncidentType, measure: Measure) {
  return prisma.$transaction(
    async (tx) => {
      const now = serverNow()
      // Repeats of one kind are counted on one record until reviewed, so a flaky connection isn't noise
      const open = await tx.incident.findFirst({ where: { attemptId, type, reviewedAt: null } })
      const details = addTo((open?.details ?? {}) as Details, measure)
      if (open) {
        await tx.incident.update({ where: { id: open.id }, data: { occurrences: { increment: 1 }, lastAt: now, details } })
      } else {
        await tx.incident.create({ data: { attemptId, type, firstAt: now, lastAt: now, details } })
      }
    },
    { isolationLevel: 'Serializable' }
  )
}

/** Records only what this examination is configured to record. All times are the server's. */
export async function recordIncident(attemptId: number, type: IncidentType, measure: Measure = {}) {
  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { isSandbox: true, exam: { select: { monitoring: true } } },
    })
    if (!attempt || attempt.isSandbox || !readSettings(attempt.exam.monitoring)[INDICATORS[type].setting]) return false

    for (let tries = 1; ; tries += 1) {
      try {
        await store(attemptId, type, measure)
        return true
      } catch (error) {
        const clashed = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
        if (!clashed || tries >= 3) throw error
      }
    }
  } catch (error) {
    // Monitoring must never break the examination itself
    console.error('Failed to record incident:', error)
    return false
  }
}

/**
 * Notes contact from the candidate's screen. If it had been silent longer than the examination
 * allows, the gap is recorded. The server measures it; the browser is not asked.
 */
export async function noteContact(attemptId: number) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { status: true, lastSeenAt: true, exam: { select: { monitoring: true } } },
  })
  if (!attempt || attempt.status !== 'IN_PROGRESS') return
  const now = serverNow()
  // Conditional on the previous value, so parallel requests record one gap only
  const { count } = await prisma.attempt.updateMany({
    where: { id: attemptId, status: 'IN_PROGRESS', lastSeenAt: attempt.lastSeenAt },
    data: { lastSeenAt: now },
  })
  const gap = Math.round((now.getTime() - attempt.lastSeenAt.getTime()) / 1000)
  if (count && gap > readSettings(attempt.exam.monitoring).disconnectedAfterSeconds) {
    await recordIncident(attemptId, 'RECONNECTED', { seconds: gap })
  }
}
