import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { renameTopic } from '@/lib/services/topics'
import { topicSchema } from '@/lib/validation/questions'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const PATCH = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { name } = await parseBody(request, topicSchema, 4096)
  return NextResponse.json({ topic: await renameTopic(actor, id, name) })
})
