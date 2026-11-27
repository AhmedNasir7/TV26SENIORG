import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { searchCandidates } from '@/lib/services/enrollments'
import { peopleQuerySchema } from '@/lib/validation/exams'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

const NO_STORE = { 'Cache-Control': 'private, no-store' } // responses list people

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const search = [...new URL(request.url).searchParams].filter(([, value]) => value !== '')
  const query = parseInput(Object.fromEntries(search), peopleQuerySchema)
  return NextResponse.json(await searchCandidates(actor, id, query), { headers: NO_STORE })
})
