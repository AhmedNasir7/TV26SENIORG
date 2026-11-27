import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { route } from '@/lib/server/api'
import { aiConfigured } from '@/lib/server/ai'

/** Which optional services are set up: booleans only, never keys. */
export const GET = route(async () => {
  await requireUser(ROLES)
  return NextResponse.json({
    speech: Boolean(process.env.ELEVENLABS_API_KEY),
    ai: aiConfigured(),
    meetings: Boolean((process.env.APP_ACCESS_KEY || process.env.MANAGEMENT_TOKEN) && process.env.TEMPLATE_ID),
    calendar: Boolean(process.env.OAUTH_CLIENT_ID && process.env.OAUTH_CLIENT_SECRET),
  })
})
