import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { getExamQuestions, setExamQuestions } from '@/lib/services/exam-questions'
import { examQuestionsSchema } from '@/lib/validation/questions'
import { idSchema } from '@/lib/validation/users'

const NO_STORE = { 'Cache-Control': 'private, no-store' } // responses carry answer keys
type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json(await getExamQuestions(actor, id), { headers: NO_STORE })
})

export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const input = await parseBody(request, examQuestionsSchema, 64 * 1024)
  return NextResponse.json(await setExamQuestions(actor, id, input), { headers: NO_STORE })
})
