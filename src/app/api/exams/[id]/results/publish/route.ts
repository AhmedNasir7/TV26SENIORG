import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { setResultsPublished } from '@/lib/services/results'
import { resultsPublishSchema } from '@/lib/validation/grading'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const input = await parseBody(request, resultsPublishSchema, 4096)
  return NextResponse.json(await setResultsPublished(actor, id, input))
})
