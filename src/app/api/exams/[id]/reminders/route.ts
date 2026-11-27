import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { sendRemindersNow } from '@/lib/services/reminders'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

/** Examiner's "send reminders now" button. */
export const POST = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await sendRemindersNow(actor, parseInput((await params).id, idSchema)), { headers: { 'Cache-Control': 'private, no-store' } })
})
