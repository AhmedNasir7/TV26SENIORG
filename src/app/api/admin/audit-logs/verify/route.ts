import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { route } from '@/lib/server/api'
import { rateLimit } from '@/lib/server/rate-limit'
import { verifyAuditChain } from '@/lib/services/audit-chain'

export const POST = route(async () => {
  const actor = await requireUser(['ADMIN'])
  rateLimit(`audit-verify:${actor.id}`, 6, 60_000)
  return NextResponse.json(await verifyAuditChain())
})
