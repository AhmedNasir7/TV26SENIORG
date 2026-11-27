/**
 * Sliding-window limit kept in memory, per server instance. Enough to stop a runaway script on a
 * single server; a multi-instance deployment would need a shared store.
 */
import { ApiError } from '@/lib/server/api'

const hits = new Map<string, number[]>()
const MAX_KEYS = 10_000

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs)
  if (recent.length >= limit) throw new ApiError('RATE_LIMITED', 'Too many requests. Wait a moment.')
  recent.push(now)
  if (hits.size >= MAX_KEYS && !hits.has(key)) hits.clear()
  hits.set(key, recent)
}
