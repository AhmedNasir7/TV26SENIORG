import { NextResponse, type NextRequest } from 'next/server'

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Refuses state-changing requests sent from another website (CSRF). Browsers always attach Origin to
 * these; server callers (the reminder timer, webhooks) send none and are checked by their own secret.
 */
export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (SAFE.has(request.method) || !origin) return NextResponse.next()

  const host = URL.canParse(origin) ? new URL(origin).host : ''
  const own = [request.headers.get('host'), request.headers.get('x-forwarded-host')]
  if (host && own.includes(host)) return NextResponse.next()

  return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Request from another site refused' } }, { status: 403 })
}

export const config = { matcher: '/api/:path*' }
