import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { getScratchpad, saveScratchpad } from '@/lib/services/workspace'
import { scratchpadSchema } from '@/lib/validation/workspace'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(ROLES) // the service allows only the person sitting the attempt
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json(await getScratchpad(actor, id), { headers: NO_STORE })
})

export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(ROLES)
  const id = parseInput((await params).id, idSchema)
  const input = await parseBody(request, scratchpadSchema, 128 * 1024)
  return NextResponse.json(await saveScratchpad(actor, id, input))
})
