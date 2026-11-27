import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { setReminder } from '@/lib/services/reminders'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
// null clears the choice; up to a week ahead
const schema = z.strictObject({ minutes: z.number().int().min(1).max(10080).nullable() })

/** The candidate's own choice of when to be reminded; it feeds the calendar file and the reminder email. */
export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const { minutes } = await parseBody(request, schema, 512)
  return NextResponse.json(await setReminder(actor.id, parseInput((await params).id, idSchema), minutes), { headers: { 'Cache-Control': 'private, no-store' } })
})
