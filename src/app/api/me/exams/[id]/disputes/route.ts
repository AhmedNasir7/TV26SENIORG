import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { raiseDispute } from '@/lib/services/disputes'
import { disputeSchema } from '@/lib/validation/extras'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const id = parseInput((await params).id, idSchema)
  const { attemptQuestionId, reason } = await parseBody(request, disputeSchema, 8192)
  return NextResponse.json(await raiseDispute(actor, id, attemptQuestionId, reason), { status: 201 })
})
