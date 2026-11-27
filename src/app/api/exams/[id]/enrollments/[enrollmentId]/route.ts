import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { removeEnrollment, setExtraTime } from '@/lib/services/enrollments'
import { extraTimeSchema } from '@/lib/validation/exams'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string; enrollmentId: string }> }

async function ids({ params }: Context) {
  const { id, enrollmentId } = await params
  return [parseInput(id, idSchema), parseInput(enrollmentId, idSchema)] as const
}

export const PATCH = route(async (request: Request, context: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const [examId, enrollmentId] = await ids(context)
  const input = await parseBody(request, extraTimeSchema, 4096)
  return NextResponse.json(await setExtraTime(actor, examId, enrollmentId, input))
})

export const DELETE = route(async (_request: Request, context: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const [examId, enrollmentId] = await ids(context)
  return NextResponse.json(await removeEnrollment(actor, examId, enrollmentId))
})
