import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { setPublished } from '@/lib/services/exams'
import { publishSchema } from '@/lib/validation/exams'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { published } = await parseBody(request, publishSchema, 1024)
  return NextResponse.json({ exam: await setPublished(actor, id, published) })
})
