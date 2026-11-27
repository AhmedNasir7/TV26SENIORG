import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { advanceAttempt } from '@/lib/services/attempts'
import { progressSchema } from '@/lib/validation/attempts'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(ROLES) // the service limits staff to their own sandbox
  const id = parseInput((await params).id, idSchema)
  const { sessionId, position } = await parseBody(request, progressSchema, 1024)
  return NextResponse.json(
    { attempt: await advanceAttempt(actor, id, sessionId, position) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
})
