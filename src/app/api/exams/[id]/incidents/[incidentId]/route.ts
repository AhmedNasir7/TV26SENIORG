import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { reviewIncident } from '@/lib/services/monitor'
import { reviewSchema } from '@/lib/validation/monitoring'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; incidentId: string }> }

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, incidentId } = await params
  const { note } = await parseBody(request, reviewSchema, 8192)
  return NextResponse.json(await reviewIncident(actor, parseInput(id, idSchema), parseInput(incidentId, idSchema), note))
})
