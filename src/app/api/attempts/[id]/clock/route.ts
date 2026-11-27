import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseInput, route } from '@/lib/server/api'
import { attemptClock } from '@/lib/services/attempts'
import { idSchema } from '@/lib/validation/users'

const NO_STORE = { 'Cache-Control': 'private, no-store' }
type Context = { params: Promise<{ id: string }> }

export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const id = parseInput((await params).id, idSchema)
  const session = new URL(request.url).searchParams.get('session')?.slice(0, 64) ?? undefined
  return NextResponse.json(await attemptClock(actor, id, session), { headers: NO_STORE })
})
