import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { reportEvents } from '@/lib/services/events'
import { eventsSchema } from '@/lib/validation/monitoring'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const id = parseInput((await params).id, idSchema)
  const input = await parseBody(request, eventsSchema, 4096)
  return NextResponse.json(await reportEvents(actor, id, input))
})
