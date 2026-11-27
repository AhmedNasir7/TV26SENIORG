import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { openSandbox } from '@/lib/services/sandbox'
import { sandboxOpenSchema } from '@/lib/validation/workspace'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { sessionId } = await parseBody(request, sandboxOpenSchema, 1024)
  return NextResponse.json(await openSandbox(actor, id, sessionId), { headers: NO_STORE })
})
