import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { leaveAttempt } from '@/lib/services/attempts'
import { submitSchema } from '@/lib/validation/attempts'
import { idSchema } from '@/lib/validation/users'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

/** The candidate confirmed leaving a running examination: it is cancelled. */
export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const id = parseInput((await params).id, idSchema)
  const { sessionId } = await parseBody(request, submitSchema, 1024)
  return NextResponse.json({ attempt: await leaveAttempt(actor, id, sessionId) }, { headers: NO_STORE })
})
