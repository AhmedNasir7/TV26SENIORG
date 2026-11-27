import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { openAttempt } from '@/lib/services/attempts'
import { openAttemptSchema } from '@/lib/validation/attempts'
import { idSchema } from '@/lib/validation/users'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

/** Start (`start: true`) or resume this candidate's attempt. */
export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const examId = parseInput((await params).id, idSchema)
  const { start, sessionId } = await parseBody(request, openAttemptSchema, 1024)
  return NextResponse.json(await openAttempt(actor, examId, start, sessionId), { headers: NO_STORE })
})
