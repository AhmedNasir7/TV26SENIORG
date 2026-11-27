import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { z } from 'zod'
import { logActivity, notifyUser } from '@/lib/activity'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiError, parseBody, route } from '@/lib/server/api'
import { requireSetupCode } from '@/lib/server/signup-code'
import { verifyHuman } from '@/lib/server/turnstile'

const FIREBASE_PROJECT_ID = "technoverse26sg"
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
)

type FirebaseIdTokenPayload = JWTPayload & {
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

const bodySchema = z.strictObject({ idToken: z.string().min(1).max(4096), setupCode: z.string().max(200).optional() })

async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdTokenPayload> {
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
    })
    return payload as FirebaseIdTokenPayload
  } catch {
    throw new ApiError('UNAUTHORIZED', 'Google sign-in failed')
  }
}

/**
 * Google is for administrators. An existing administrator is signed in; a new Google account becomes
 * an administrator only with the setup code. Examiners and candidates sign in with a password.
 */
export const POST = route(async (request: Request) => {
  await verifyHuman(request, 'signup')
  const { idToken, setupCode } = await parseBody(request, bodySchema, 8192)
  const payload = await verifyFirebaseIdToken(idToken)

  const email = payload.email?.trim().toLowerCase()
  if (!email || payload.email_verified !== true) {
    throw new ApiError('UNAUTHORIZED', 'Google email is not verified')
  }

  let existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) {
    requireSetupCode(setupCode)
    existing = await prisma.user.create({
      // No password is usable until the owner sets one: Google proves who they are
      data: { email, name: payload.name?.trim() || null, role: 'ADMIN', passwordHash: await hashPassword(randomUUID()) },
    })
    await logActivity({ action: 'user_registered', entityType: 'user', entityId: existing.id, userId: existing.id, metadata: { method: 'google', email } })
  }
  if (existing.status !== 'ACTIVE' || existing.role !== 'ADMIN') {
    throw new ApiError('FORBIDDEN', 'Google sign-in is for administrators. Use your email and password on the sign-in page.')
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name ?? payload.name?.trim() ?? null,
      imageUrl: payload.picture?.trim() || existing.imageUrl,
      failedLogins: 0,
      lockedUntil: null,
      // Google proved ownership of the email: retire any unused temporary password
      ...(existing.mustChangePassword && {
        mustChangePassword: false,
        passwordHash: await hashPassword(randomUUID()),
        sessionVersion: { increment: 1 },
      }),
    },
  })
  await setAuthCookie(user)

  await logActivity({
    action: user.role === 'ADMIN' ? 'admin_login' : 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
    userId: user.id,
    metadata: { method: 'google', email: user.email },
  })
  await notifyUser({
    userId: user.id,
    title: 'New sign-in',
    message: 'You signed in with Google.',
    type: 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, imageUrl: user.imageUrl },
  })
})
