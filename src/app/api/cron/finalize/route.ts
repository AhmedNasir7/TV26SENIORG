import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { ApiError, route } from '@/lib/server/api'
import { finalizeExpired } from '@/lib/services/finalize'

/** Optional sweep for a scheduler. Expired attempts are also finalized whenever they are read. */
export const POST = route(async (request: Request) => {
  const secret = process.env.CRON_SECRET
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new ApiError('UNAUTHORIZED', 'Not allowed')
  }
  return NextResponse.json({ finalized: await finalizeExpired() })
})
