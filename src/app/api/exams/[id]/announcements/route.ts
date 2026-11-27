import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { listAnnouncements, sendAnnouncement } from '@/lib/services/announcements'
import { announcementSchema } from '@/lib/validation/monitoring'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json({ announcements: await listAnnouncements(actor, id) })
})

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser(STAFF_ROLES)
  const id = parseInput((await params).id, idSchema)
  const { message } = await parseBody(request, announcementSchema, 8192)
  return NextResponse.json({ announcement: await sendAnnouncement(actor, id, message) }, { status: 201 })
})
