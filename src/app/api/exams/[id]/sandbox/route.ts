import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { discardSandbox, startSandbox } from '@/lib/services/sandbox'
import { sandboxStartSchema } from '@/lib/validation/workspace'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { minutes } = await parseBody(request, sandboxStartSchema, 1024)
  return NextResponse.json(await startSandbox(actor, id, minutes), { status: 201 })
})

export const DELETE = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await discardSandbox(actor, parseInput((await params).id, idSchema)))
})
