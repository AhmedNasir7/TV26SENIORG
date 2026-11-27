import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { setArchived } from '@/lib/services/questions'
import { archiveSchema } from '@/lib/validation/questions'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { archived } = await parseBody(request, archiveSchema, 1024)
  return NextResponse.json({ question: await setArchived(actor, id, archived) })
})
