import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { explainBoard, integrityBoard } from '@/lib/services/integrity-board'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** The ranked scores: no AI, always available. */
export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await integrityBoard(actor, parseInput((await params).id, idSchema)), { headers: NO_STORE })
})

/** One batched AI explanation of the top of the list, only when asked. */
export const POST = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json({ explanation: await explainBoard(actor, parseInput((await params).id, idSchema)) }, { headers: NO_STORE })
})
