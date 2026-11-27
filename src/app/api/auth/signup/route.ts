import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseBody, route } from '@/lib/server/api'
import { requireSetupCode } from '@/lib/server/signup-code'
import { verifyHuman } from '@/lib/server/turnstile'
import { signupSchema } from '@/lib/validation/auth'

/** Creates an administrator for someone who holds the setup code. */
export const POST = route(async (request: Request) => {
  await verifyHuman(request, 'signup')
  const { email, password, name, setupCode } = await parseBody(request, signupSchema, 4096)
  requireSetupCode(setupCode)

  // The unique email constraint turns a duplicate into a 409 in route()
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(password), role: 'ADMIN' },
  })
  await setAuthCookie(user)

  await logActivity({
    action: 'user_registered',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    metadata: { email: user.email, role: user.role },
  })

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } }, { status: 201 })
})
