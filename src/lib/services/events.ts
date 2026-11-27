/** Intake of what a candidate's browser reports about its own attempt. Treated as untrusted. */
import { readSettings } from '@/lib/monitoring'
import { ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { recordIncident } from '@/lib/services/incidents'
import type { EventsInput } from '@/lib/validation/monitoring'

export async function reportEvents(actor: Actor, attemptId: number, { sessionId, events }: EventsInput) {
  rateLimit(`events:${actor.id}`, 30, 60_000)
  const attempt = ensureFound(
    await prisma.attempt.findUnique({
      where: { id: attemptId },
      select: { candidateId: true, isSandbox: true, status: true, activeSessionId: true, exam: { select: { monitoring: true } } },
    }),
    (a) => a.candidateId === actor.id && !a.isSandbox
  )
  if (attempt.status !== 'IN_PROGRESS') throw new ApiError('CONFLICT', 'This attempt has ended')
  if (attempt.activeSessionId !== sessionId) throw new ApiError('CONFLICT', 'This attempt is open somewhere else')

  const settings = readSettings(attempt.exam.monitoring)
  let recorded = 0
  for (const event of events) {
    const away = event.type === 'TAB_HIDDEN' || event.type === 'WINDOW_BLUR'
    if (away && (event.seconds ?? 0) < settings.minAwaySeconds) continue
    // Switched-off kinds are refused inside recordIncident
    if (await recordIncident(attemptId, event.type, { seconds: event.seconds, characters: event.characters })) recorded += 1
  }
  return { recorded }
}
