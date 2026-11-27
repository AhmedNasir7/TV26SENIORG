import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { examResults } from '@/lib/services/results'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json(await examResults(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
})
