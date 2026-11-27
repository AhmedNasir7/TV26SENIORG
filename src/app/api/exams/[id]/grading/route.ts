import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { gradingQueue } from '@/lib/services/grading'
import { gradingQuerySchema } from '@/lib/validation/grading'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const query = parseInput(Object.fromEntries(new URL(request.url).searchParams), gradingQuerySchema)
  return NextResponse.json(await gradingQueue(actor, id, query), { headers: { 'Cache-Control': 'private, no-store' } })
})
