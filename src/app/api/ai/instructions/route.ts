import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { draftInstructions } from '@/lib/services/ai-features'

const schema = z.strictObject({
  title: z.string().trim().min(1).max(200),
  durationMinutes: z.number().int().min(1).max(1440),
  allowBackNavigation: z.boolean(),
  live: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
})

/** A draft for the examiner to edit; nothing is saved here. */
export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await draftInstructions(actor, await parseBody(request, schema, 4096)))
})
