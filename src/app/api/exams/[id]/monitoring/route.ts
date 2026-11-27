import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { monitorSettings, updateSettings } from '@/lib/services/monitor'
import { monitoringSettingsSchema } from '@/lib/validation/monitoring'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  return NextResponse.json(await monitorSettings(actor, parseInput((await params).id, idSchema)))
})

export const PUT = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const settings = await parseBody(request, monitoringSettingsSchema, 4096)
  return NextResponse.json(await updateSettings(actor, id, settings))
})
