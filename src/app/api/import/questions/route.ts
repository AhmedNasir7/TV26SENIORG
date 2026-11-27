import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { importQuestions } from '@/lib/services/imports'
import { importSchema } from '@/lib/validation/extras'

export const POST = route(async (request: Request) => {
  const actor = await requireUser(STAFF_ROLES)
  const input = await parseBody(request, importSchema, 512 * 1024)
  return NextResponse.json(await importQuestions(actor, input), { headers: { 'Cache-Control': 'private, no-store' } })
})
