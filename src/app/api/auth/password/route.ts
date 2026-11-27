import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { getSession, hashPassword, setAuthCookie, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiError, parseBody, route } from '@/lib/server/api'
import { changePasswordSchema } from '@/lib/validation/auth'
import { verifyHuman } from '@/lib/server/turnstile'

/** Change own password. Every other session of this account ends. */
export const POST = route(async (request: Request) => {
  // getSession, not requireUser: accounts with a temporary password must be able to reach this
  const session = await getSession()
  if (!session) throw new ApiError('UNAUTHORIZED', 'Sign in to continue')

  await verifyHuman(request, 'password')
  const { currentPassword, newPassword } = await parseBody(request, changePasswordSchema, 4096)
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: { passwordHash: true },
  })

  if (!(await verifyPassword(currentPassword, account.passwordHash))) {
    throw new ApiError('BAD_REQUEST', 'Check the highlighted fields', {
      currentPassword: 'Current password is wrong',
    })
  }

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
    select: { id: true, sessionVersion: true },
  })
  await setAuthCookie(updated)
  await logActivity({ action: 'password_changed', entityType: 'user', entityId: updated.id, userId: updated.id })

  return NextResponse.json({ ok: true })
})
