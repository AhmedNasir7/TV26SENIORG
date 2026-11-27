import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { saveAnswer } from '@/lib/services/attempts'
import { saveAnswerSchema } from '@/lib/validation/attempts'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; questionId: string }> }

export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const { id, questionId } = await params
  const input = await parseBody(request, saveAnswerSchema, 96 * 1024)
  const result = await saveAnswer(actor, parseInput(id, idSchema), parseInput(questionId, idSchema), input)
  return NextResponse.json(result)
})
