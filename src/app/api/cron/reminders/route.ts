import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { ApiError, route } from '@/lib/server/api'
import { finalizeExpired } from '@/lib/services/finalize'
import { sendReminders } from '@/lib/services/reminders'

/** Called by the server's timer with the shared secret; there is no user session. */
export const POST = route(async (request: Request) => {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  const matches = secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  if (!matches) throw new ApiError('UNAUTHORIZED', 'Not allowed')
  const finalized = await finalizeExpired()
  return NextResponse.json({ finalized, ...(await sendReminders()) })
})
