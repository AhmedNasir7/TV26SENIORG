import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { createQuestion, listQuestions } from '@/lib/services/questions'
import { questionListSchema, questionSchema } from '@/lib/validation/questions'

const NO_STORE = { 'Cache-Control': 'private, no-store' } // responses carry answer keys

export const GET = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const params = [...new URL(request.url).searchParams].filter(([, value]) => value !== '')
  const filter = parseInput(Object.fromEntries(params), questionListSchema)
  return NextResponse.json(await listQuestions(actor, filter), { headers: NO_STORE })
})

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const input = await parseBody(request, questionSchema, 64 * 1024)
  return NextResponse.json({ question: await createQuestion(actor, input) }, { status: 201 })
})
