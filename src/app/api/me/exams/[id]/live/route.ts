import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseInput, route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { candidatePass } from '@/lib/services/live-exam'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** A pass into the live room for an enrolled candidate. */
export const POST = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  rateLimit(`live:${actor.id}`, 12, 60_000)
  return NextResponse.json(await candidatePass(actor, parseInput((await params).id, idSchema)), { headers: NO_STORE })
})
