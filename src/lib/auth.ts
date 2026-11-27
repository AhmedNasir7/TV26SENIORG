import { cache } from 'react'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import type { Role } from '@/lib/roles'

const COOKIE = 'auth-token'
const SESSION_SECONDS = 60 * 60 * 12

export type SessionUser = {
  id: number
  email: string
  name: string | null
  role: Role
  imageUrl: string | null
  mustChangePassword: boolean
}

function signingKey() {
  const secret = process.env.JWT_SECRET
  // No fallback: a guessable default would let anyone forge a session
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword)
}

/** The cookie holds only who signed in and which session generation; everything else is read fresh. */
export async function setAuthCookie(user: { id: number; sessionVersion: number }) {
  const token = await new SignJWT({ sv: user.sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(signingKey())

  // Browsers drop Secure cookies on plain HTTP, so follow the deployment's real protocol
  const isHttps = (process.env.NEXT_PUBLIC_APP_URL ?? '').startsWith('https://')

  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: SESSION_SECONDS,
    path: '/',
  })
}

export async function removeAuthCookie() {
  ;(await cookies()).delete(COOKIE)
}

/**
 * The signed-in account as the database sees it right now, including accounts that still have
 * to change their password. Only the password and "who am I" routes should need this.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null

  let id: number
  let sessionVersion: unknown
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ['HS256'] })
    id = Number(payload.sub)
    sessionVersion = payload.sv
  } catch {
    return null
  }
  if (!Number.isInteger(id)) return null

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      imageUrl: true,
      status: true,
      sessionVersion: true,
      mustChangePassword: true,
    },
  })
  // Disabled accounts and sessions from before a password or role change are rejected
  if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== sessionVersion) return null

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    imageUrl: user.imageUrl,
    mustChangePassword: user.mustChangePassword,
  }
})

/** A fully usable account, or null. A pending password change counts as not usable. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await getSession()
  return user && !user.mustChangePassword ? user : null
}

/** For API routes wrapped in `route()`: throws 401 or 403. */
export async function requireUser(roles?: readonly Role[]): Promise<SessionUser> {
  const user = await getSession()
  if (!user) throw new ApiError('UNAUTHORIZED', 'Sign in to continue')
  if (user.mustChangePassword) throw new ApiError('FORBIDDEN', 'Change your password first')
  if (roles && !roles.includes(user.role)) throw new ApiError('FORBIDDEN', 'You do not have access to this')
  return user
}

/** For server pages and layouts: redirects instead of throwing. */
export async function requirePageUser(roles?: readonly Role[]): Promise<SessionUser> {
  const user = await getSession()
  if (!user) redirect('/login')
  if (user.mustChangePassword) redirect('/change-password')
  if (roles && !roles.includes(user.role)) redirect('/')
  return user
}
