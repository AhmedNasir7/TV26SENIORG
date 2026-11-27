import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { attemptTimeline } from '@/lib/services/monitor'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; attemptId: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, attemptId } = await params
  const timeline = await attemptTimeline(actor, parseInput(id, idSchema), parseInput(attemptId, idSchema))
  return NextResponse.json(timeline, { headers: NO_STORE })
})
