import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { recordingLink, setRecording } from '@/lib/services/live-exam'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const schema = z.strictObject({ record: z.boolean() })
const assetSchema = z.string().regex(/^[A-Za-z0-9-]{6,80}$/)

/** Sends staff to a temporary link for one recorded file of their examination. */
export const GET = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const asset = parseInput(new URL(request.url).searchParams.get('asset'), assetSchema)
  return NextResponse.redirect(await recordingLink(actor, id, asset))
})

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { record } = await parseBody(request, schema, 512)
  return NextResponse.json(await setRecording(actor, id, record), { headers: NO_STORE })
})
