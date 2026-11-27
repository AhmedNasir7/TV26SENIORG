import { createHash, timingSafeEqual } from 'node:crypto'
import { isSignupOpen } from '@/lib/config'
import { ApiError } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'

const digest = (value: string) => createHash('sha256').update(value).digest()

/** Throws unless the caller knows the administrator setup code. Guesses are limited. */
export function requireSetupCode(given: string | undefined) {
  if (!isSignupOpen()) throw new ApiError('FORBIDDEN', 'Administrator sign-up is closed on this server.')
  rateLimit('admin-setup-code', 20, 10 * 60_000)
  if (!given || !timingSafeEqual(digest(given.trim()), digest(process.env.ADMIN_SIGNUP_CODE!))) {
    throw new ApiError('FORBIDDEN', 'The setup code is not correct.')
  }
}
