import { NextResponse } from 'next/server'
import { logActivity, notifyUser } from '@/lib/activity'
import { setAuthCookie } from '@/lib/auth'
import { signInWithPassword } from '@/lib/services/signin'
import { parseBody, route } from '@/lib/server/api'
import { loginSchema } from '@/lib/validation/auth'
import { verifyHuman } from '@/lib/server/turnstile'

export const POST = route(async (request: Request) => {
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
    message: `You signed in at ${new Date().toISOString()}`,
    type: 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    mustChangePassword: user.mustChangePassword,
  })
})
