import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { createTopic, listTopics } from '@/lib/services/topics'
import { topicSchema } from '@/lib/validation/questions'

export const GET = route(async () => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json({ topics: await listTopics(actor) })
})

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const { name } = await parseBody(request, topicSchema, 4096)
  return NextResponse.json({ topic: await createTopic(actor, name) }, { status: 201 })
})
