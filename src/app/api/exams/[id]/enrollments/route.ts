import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { enroll, listEnrollments } from '@/lib/services/enrollments'
import { enrollSchema, peopleQuerySchema } from '@/lib/validation/exams'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

const NO_STORE = { 'Cache-Control': 'private, no-store' } // responses list people

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const search = [...new URL(request.url).searchParams].filter(([, value]) => value !== '')
  const query = parseInput(Object.fromEntries(search), peopleQuerySchema)
  return NextResponse.json(await listEnrollments(actor, id, query), { headers: NO_STORE })
})

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { candidateIds } = await parseBody(request, enrollSchema, 16 * 1024)
  return NextResponse.json(await enroll(actor, id, candidateIds), { status: 201 })
})
