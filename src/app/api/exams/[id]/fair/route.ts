import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { fairEvidence, saveBlueprint } from '@/lib/services/fair'
import { fairSchema } from '@/lib/validation/extras'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

/** `preview` compares 200 plain and balanced draws; otherwise the recipe is saved (null clears it). */
export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { rules, preview } = await parseBody(request, fairSchema, 16_384)
  if (preview && rules) return NextResponse.json(await fairEvidence(actor, id, rules))
  return NextResponse.json(await saveBlueprint(actor, id, rules))
})
