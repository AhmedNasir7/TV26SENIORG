import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseInput, route } from '@/lib/server/api'
import { getCandidateExam } from '@/lib/services/access'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(['CANDIDATE'])
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json(await getCandidateExam(actor, id), { headers: { 'Cache-Control': 'private, no-store' } })
})
