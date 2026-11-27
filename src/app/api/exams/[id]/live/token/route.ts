import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { staffPass } from '@/lib/services/live-exam'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

export const POST = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await staffPass(actor, parseInput((await params).id, idSchema)), { headers: NO_STORE })
})
