import { NextResponse } from 'next/server'
import { route } from '@/lib/server/api'
import { turnstileSiteKey } from '@/lib/server/turnstile'

export const dynamic = 'force-dynamic'

/** Tells forms whether to show the security check. Only the public site key is ever returned. */
export const GET = route(async () => NextResponse.json({ siteKey: turnstileSiteKey() }))
