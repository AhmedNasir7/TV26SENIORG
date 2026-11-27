import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { draftQuestions } from '@/lib/services/ai-features'

const schema = z.strictObject({
  subject: z.string().trim().min(3).max(200),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN']),
  count: z.number().int().min(1).max(5),
})

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await draftQuestions(actor, await parseBody(request, schema, 2048)))
})
