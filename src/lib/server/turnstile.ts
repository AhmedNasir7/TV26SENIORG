/**
 * Cloudflare Turnstile: proof that a person, not a script, sent a form. Optional like every outside
 * service: without TURNSTILE_SECRET_KEY nothing is asked. When it is set, a request that cannot be
 * verified is refused.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError } from '@/lib/server/api'
import { TOKEN_HEADER, type HumanAction } from '@/lib/turnstile'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
// A site key is public: it appears in every page that shows the widget
const DEFAULT_SITE_KEY = '0x4AAAAAAGVgMjMShj__7XwQ'
// Cloudflare's published test secrets start like this and report placeholder hostnames and actions
const TEST_SECRET = /^[123]x0{10}/

const replySchema = z.object({ success: z.boolean(), action: z.string().optional(), hostname: z.string().optional() })

export const turnstileSiteKey = () =>
  process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY || DEFAULT_SITE_KEY : null

const refused = () => new ApiError('FORBIDDEN', 'The security check did not pass. Wait for it to finish, then try again.')

function allowedHostnames(request: Request) {
  const listed = (process.env.TURNSTILE_HOSTNAMES ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
  // Without a list, the widget must have been solved on the host that received the request
  return listed.length ? listed : [(request.headers.get('host') ?? '').split(':')[0].toLowerCase()]
}

/** Throws unless this request carries a fresh, valid token for this form. Tokens work once. */
export async function verifyHuman(request: Request, action: HumanAction) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return

  const token = request.headers.get(TOKEN_HEADER)
  if (!token || token.length > 2048) throw refused()

  let reply: z.infer<typeof replySchema>
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`siteverify answered ${response.status}`)
    reply = replySchema.parse(await response.json())
  } catch (error) {
    console.error('Turnstile verification unavailable:', error)
    throw new ApiError('FORBIDDEN', 'The security check is unavailable right now. Try again shortly.')
  }

  if (!reply.success) throw refused()
  if (TEST_SECRET.test(secret)) return
  if (reply.action !== action || !allowedHostnames(request).includes((reply.hostname ?? '').toLowerCase())) throw refused()
}

/** For older routes that build their own responses. Null means the request may continue. */
export async function humanCheckResponse(request: Request, action: HumanAction) {
  try {
    await verifyHuman(request, action)
    return null
  } catch (error) {
    const message = error instanceof ApiError ? error.message : 'The security check failed'
    return NextResponse.json({ error: message }, { status: 403 })
  }
}
