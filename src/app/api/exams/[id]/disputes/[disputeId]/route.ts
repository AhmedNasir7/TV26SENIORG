import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { resolveDispute } from '@/lib/services/disputes'
import { resolveDisputeSchema } from '@/lib/validation/extras'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; disputeId: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, disputeId } = await params
  const input = await parseBody(request, resolveDisputeSchema, 8192)
  return NextResponse.json(await resolveDispute(actor, parseInput(id, idSchema), parseInput(disputeId, idSchema), input))
})
