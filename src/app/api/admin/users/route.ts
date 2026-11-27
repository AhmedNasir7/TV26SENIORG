import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { createUser, listUsers } from '@/lib/services/users'
import { createUserSchema, userListSchema } from '@/lib/validation/users'

// Responses can contain personal data and one-time passwords: never cache them
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const GET = route(async (request: Request) => {
  await requireUser(['ADMIN'])
  const params = [...new URL(request.url).searchParams].filter(([, value]) => value !== '')
  const filter = parseInput(Object.fromEntries(params), userListSchema)
  return NextResponse.json(await listUsers(filter), { headers: NO_STORE })
})

export const POST = route(async (request: Request) => {
  const admin = await requireUser(['ADMIN'])
  const input = await parseBody(request, createUserSchema, 4096)
  return NextResponse.json(await createUser(admin.id, input), { status: 201, headers: NO_STORE })
})
