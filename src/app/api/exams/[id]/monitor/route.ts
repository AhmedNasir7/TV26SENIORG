import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { monitorBoard } from '@/lib/services/monitor'
import { monitorQuerySchema } from '@/lib/validation/monitoring'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const query = parseInput(Object.fromEntries(new URL(request.url).searchParams), monitorQuerySchema)
  return NextResponse.json(await monitorBoard(actor, id, query), { headers: NO_STORE })
})
