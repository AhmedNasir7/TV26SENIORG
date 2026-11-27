import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { voidQuestion } from '@/lib/services/examiner-actions'
import { voidSchema } from '@/lib/validation/extras'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { questionVersionId, reason } = await parseBody(request, voidSchema, 4096)
  return NextResponse.json(await voidQuestion(actor, id, questionVersionId, reason))
})
