/** Each person's display choices, restored on any device. */
import { readPreferences, type Preferences } from '@/lib/preferences'
import type { Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/server/rate-limit'

export async function getPreferences(userId: number) {
  const row = await prisma.preference.findUnique({ where: { userId }, select: { settings: true } })
  return readPreferences(row?.settings)
}

export async function savePreferences(actor: Actor, settings: Preferences) {
  rateLimit(`prefs:${actor.id}`, 60, 60_000)
  await prisma.preference.upsert({ where: { userId: actor.id }, create: { userId: actor.id, settings }, update: { settings } })
  return settings
}
