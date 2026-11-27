/** Indicators for a human to review. Never proof of misconduct, never an automatic penalty. */
import type { IncidentType } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'

/** Repeats of the same kind are counted on one record, so one flaky connection isn't noise. */
export async function recordIncident(attemptId: number, type: IncidentType) {
  try {
    const now = serverNow()
    const { count } = await prisma.incident.updateMany({
      where: { attemptId, type, reviewedAt: null },
      data: { occurrences: { increment: 1 }, lastAt: now },
    })
    if (count === 0) await prisma.incident.create({ data: { attemptId, type, firstAt: now, lastAt: now } })
  } catch (error) {
    // Monitoring must never break the examination itself
    console.error('Failed to record incident:', error)
  }
}
