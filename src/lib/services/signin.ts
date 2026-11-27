import { randomUUID } from 'node:crypto'
import { logActivity } from '@/lib/activity'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { serverNow } from '@/lib/server/time'

const MAX_FAILURES = 5
const LOCK_MINUTES = 15

// Compared against when the email is unknown, so response time doesn't reveal which emails exist
const dummyHash = hashPassword(randomUUID())

// One message for wrong email, wrong password, locked and disabled: nothing to probe
const REFUSED = `Invalid email or password. After ${MAX_FAILURES} failed attempts, sign-in pauses for ${LOCK_MINUTES} minutes.`

export async function signInWithPassword(identifier: string, password: string) {
  // A username never contains "@", so the two can't be confused
  const user = await prisma.user.findUnique({ where: identifier.includes('@') ? { email: identifier } : { username: identifier } })
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await dummyHash))

  if (!user || user.status !== 'ACTIVE' || (user.lockedUntil && user.lockedUntil > serverNow())) {
    throw new ApiError('UNAUTHORIZED', REFUSED)
  }

  if (!passwordMatches) {
    await recordFailure(user.id)
    throw new ApiError('UNAUTHORIZED', REFUSED)
  }

  if (user.failedLogins > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } })
  }
  return user
}

async function recordFailure(userId: number) {
  // Atomic increment: parallel guesses can't slip under the limit
  const { failedLogins } = await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: { increment: 1 } },
    select: { failedLogins: true },
  })
  if (failedLogins < MAX_FAILURES) return

  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: new Date(serverNow().getTime() + LOCK_MINUTES * 60_000) },
  })
  await logActivity({ action: 'account_locked', entityType: 'user', entityId: userId, userId })
}
