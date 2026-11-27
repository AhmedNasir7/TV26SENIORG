import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { createExam, listExams, PHASES } from '@/lib/services/exams'
import { z } from 'zod'

const querySchema = z.strictObject({ phase: z.enum(PHASES).optional() })

export const GET = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const { phase } = parseInput(Object.fromEntries(new URL(request.url).searchParams), querySchema)
  return NextResponse.json({ exams: await listExams(actor, phase) })
})

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const body = await parseBody(request, z.unknown(), 64 * 1024)
  return NextResponse.json({ exam: await createExam(actor, body) }, { status: 201 })
})
