import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { ROLES } from '@/lib/roles'
import { parseBody, route } from '@/lib/server/api'
import { getPreferences, savePreferences } from '@/lib/services/preferences'
import { preferencesSchema } from '@/lib/validation/workspace'

export const GET = route(async () => {
  const actor = await requireUser(ROLES)
  return NextResponse.json({ preferences: await getPreferences(actor.id) })
})

export const PUT = route(async (request: Request) => {
  const actor = await requireUser(ROLES)
  const settings = await parseBody(request, preferencesSchema, 2048)
  return NextResponse.json({ preferences: await savePreferences(actor, settings) })
})
