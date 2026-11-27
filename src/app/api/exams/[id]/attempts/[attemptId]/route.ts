import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { staffReport } from '@/lib/services/report'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; attemptId: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, attemptId } = await params
  const report = await staffReport(actor, parseInput(id, idSchema), parseInput(attemptId, idSchema))
  return NextResponse.json({ report }, { headers: { 'Cache-Control': 'private, no-store' } })
})
