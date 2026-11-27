import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { forceSubmit } from '@/lib/services/examiner-actions'
import { forceSubmitSchema } from '@/lib/validation/extras'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; attemptId: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, attemptId } = await params
  const { reason } = await parseBody(request, forceSubmitSchema, 4096)
  return NextResponse.json(await forceSubmit(actor, parseInput(id, idSchema), parseInput(attemptId, idSchema), reason))
})
