import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { integrityReview } from '@/lib/services/ai-features'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const schema = z.strictObject({ attemptId: idSchema })

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { attemptId } = await parseBody(request, schema, 1024)
  return NextResponse.json({ review: await integrityReview(actor, id, attemptId) })
})
