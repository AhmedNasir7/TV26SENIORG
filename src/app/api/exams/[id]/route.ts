import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { deleteDraft, getExam, updateExam } from '@/lib/services/exams'
import { z } from 'zod'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

const examId = async ({ params }: Context) => parseInput((await params).id, idSchema)

export const GET = route(async (_request: Request, context: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json({ exam: await getExam(actor, await examId(context)) })
})

export const PATCH = route(async (request: Request, context: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = await examId(context)
  // The service validates against the schema that matches the examination's current state
  const body = await parseBody(request, z.unknown(), 64 * 1024)
  return NextResponse.json({ exam: await updateExam(actor, id, body) })
})

export const DELETE = route(async (_request: Request, context: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json({ exam: await deleteDraft(actor, await examId(context)) })
})
