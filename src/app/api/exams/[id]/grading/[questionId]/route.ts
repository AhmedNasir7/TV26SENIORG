import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { gradeAnswer } from '@/lib/services/grading'
import { gradeSchema } from '@/lib/validation/grading'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; questionId: string }> }

/** `questionId` is the question on one candidate's paper. */
export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const { id, questionId } = await params
  const input = await parseBody(request, gradeSchema, 16_384)
  return NextResponse.json(await gradeAnswer(actor, parseInput(id, idSchema), parseInput(questionId, idSchema), input))
})
