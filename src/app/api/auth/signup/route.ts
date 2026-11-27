import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { isSignupOpen } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { ApiError, parseBody, route } from '@/lib/server/api'
import { signupSchema } from '@/lib/validation/auth'
import { verifyHuman } from '@/lib/server/turnstile'

/**
 * Public sign-up is closed unless ALLOW_PUBLIC_SIGNUP=true. Even when open it only ever creates
 * candidates; administrators come from the seed script or another administrator.
 */
export const POST = route(async (request: Request) => {
  if (!isSignupOpen()) {
    throw new ApiError('FORBIDDEN', 'Sign-up is closed. Ask your administrator for an account.')
  }

  await verifyHuman(request, 'signup')
  const { email, password, name } = await parseBody(request, signupSchema, 4096)
  // The unique email constraint turns a duplicate into a 409 in route()
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(password), role: 'CANDIDATE' },
  })
  await setAuthCookie(user)

  await logActivity({
    action: 'user_registered',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    metadata: { email: user.email, role: user.role },
  })

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 })
})
