import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { parseInput, route } from '@/lib/server/api'
import { viewAttempt } from '@/lib/services/attempts'
import { idSchema } from '@/lib/validation/users'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(ROLES) // the service limits staff to their own sandbox
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json({ attempt: await viewAttempt(actor, id) }, { headers: NO_STORE })
})
