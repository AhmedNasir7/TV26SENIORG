/** A candidate's rough work. It never touches answers or marks. */
import type { Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { currentAttempt } from '@/lib/services/attempts'
import type { ScratchpadInput } from '@/lib/validation/workspace'

/** Private to the person sitting the attempt: staff can't read a candidate's rough work. */
export async function getScratchpad(actor: Actor, attemptId: number) {
  await currentAttempt(actor, attemptId)
  const pad = await prisma.scratchpad.findUnique({ where: { attemptId } })
  return { notes: pad?.notes ?? '', drawing: (pad?.drawing ?? []) as ScratchpadInput['drawing'] }
}

export async function saveScratchpad(actor: Actor, attemptId: number, { sessionId, notes, drawing }: ScratchpadInput) {
  rateLimit(`pad:${actor.id}`, 60, 60_000)
  const attempt = await currentAttempt(actor, attemptId)
  if (attempt.status !== 'IN_PROGRESS') throw new ApiError('CONFLICT', 'This attempt has ended')
  if (attempt.activeSessionId !== sessionId) throw new ApiError('CONFLICT', 'This attempt is open somewhere else')
  await prisma.scratchpad.upsert({ where: { attemptId }, create: { attemptId, notes, drawing }, update: { notes, drawing } })
  return { saved: true }
}
