import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { updateUser } from '@/lib/services/users'
import { idSchema, updateUserSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: Request, { params }: Context) => {
  const admin = await requireUser(['ADMIN'])
  const id = parseInput((await params).id, idSchema)
  const input = await parseBody(request, updateUserSchema, 4096)
  return NextResponse.json({ user: await updateUser(admin.id, id, input) })
})
