import { NextResponse } from 'next/server'
import { logActivity, notifyUser } from '@/lib/activity'
import { setAuthCookie } from '@/lib/auth'
import { signInWithPassword } from '@/lib/services/signin'
import { parseBody, route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { loginSchema } from '@/lib/validation/auth'
import { verifyHuman } from '@/lib/server/turnstile'

/** The visitor's address as the proxy in front of the app reports it. */
const addressOf = (request: Request) =>
  request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? 'local'

export const POST = route(async (request: Request) => {
  // Accounts lock on their own; this stops one address from trying many accounts
  rateLimit(`login-ip:${addressOf(request)}`, 60, 60_000)
  await verifyHuman(request, 'login')
  const { email, password } = await parseBody(request, loginSchema, 4096)
  const user = await signInWithPassword(email, password)
  await setAuthCookie(user)

  await logActivity({
    action: user.role === 'ADMIN' ? 'admin_login' : 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    metadata: { email: user.email },
  })
  await notifyUser({
    userId: user.id,
    title: 'New sign-in',
    message: 'You signed in.',
    type: 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    mustChangePassword: user.mustChangePassword,
  })
})
