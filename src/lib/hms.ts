import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'

// 100ms management tokens are short-lived. Signing one per request from the app
// secret avoids the stale-token outages a hardcoded MANAGEMENT_TOKEN causes.
export function getManagementToken(): string {
  const accessKey = process.env.APP_ACCESS_KEY
  const secret = process.env.APP_SECRET_KEY

  if (accessKey && secret) {
    const now = Math.floor(Date.now() / 1000)
    return jwt.sign(
      { access_key: accessKey, type: 'management', version: 2, iat: now, nbf: now, jti: randomUUID() },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' }
    )
  }

  const fallback = process.env.MANAGEMENT_TOKEN
  if (!fallback) {
    throw new Error('Set APP_ACCESS_KEY and APP_SECRET_KEY (or MANAGEMENT_TOKEN) to use 100ms')
  }
  return fallback
}
