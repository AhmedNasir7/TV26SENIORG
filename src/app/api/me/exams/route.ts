import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { route } from '@/lib/server/api'
import { listCandidateExams } from '@/lib/services/access'

export const GET = route(async () => {
  const actor = await requireUser(['CANDIDATE'])
  return NextResponse.json(await listCandidateExams(actor), { headers: { 'Cache-Control': 'private, no-store' } })
})
