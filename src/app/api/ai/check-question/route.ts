import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { checkQuestion } from '@/lib/services/ai-features'

const schema = z.strictObject({
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN']),
  text: z.string().trim().min(3).max(5000),
  options: z.array(z.strictObject({ text: z.string().max(1000), correct: z.boolean() })).max(8),
  guidance: z.string().max(5000).optional(),
})

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await checkQuestion(actor, await parseBody(request, schema, 16_384)))
})
