import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { z } from 'zod'
import { logActivity, notifyUser } from '@/lib/activity'
import { hashPassword, setAuthCookie } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiError, parseBody, route } from '@/lib/server/api'

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

const bodySchema = z.strictObject({ idToken: z.string().min(1).max(4096) })

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

/** Google sign-in for accounts that already exist. It never creates one. */
export const POST = route(async (request: Request) => {
  const { idToken } = await parseBody(request, bodySchema, 8192)
  const payload = await verifyFirebaseIdToken(idToken)

  const email = payload.email?.trim().toLowerCase()
  if (!email || payload.email_verified !== true) {
    throw new ApiError('UNAUTHORIZED', 'Google email is not verified')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing || existing.status !== 'ACTIVE') {
    throw new ApiError('FORBIDDEN', 'There is no active account for this Google email. Ask your administrator.')
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
    message: `You signed in with Google at ${new Date().toISOString()}`,
    type: 'user_logged_in',
    entityType: 'user',
    entityId: user.id,
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, imageUrl: user.imageUrl },
  })
})
