import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { liveState, setLive } from '@/lib/services/live-exam'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const schema = z.strictObject({ enabled: z.boolean() })

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await liveState(actor, parseInput((await params).id, idSchema)), { headers: NO_STORE })
})

export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { enabled } = await parseBody(request, schema, 512)
  return NextResponse.json(await setLive(actor, id, enabled), { headers: NO_STORE })
})
