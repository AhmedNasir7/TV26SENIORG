import { NextResponse } from 'next/server'
import { getSession, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseBody, route } from '@/lib/server/api'
import { profileSchema } from '@/lib/validation/auth'

export const GET = route(async () => {
  const user = await getSession()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'private, no-store' } })
})

// Only the display name is editable here. Role, status and picture address are never taken from the client.
export const PATCH = route(async (request: Request) => {
  const session = await requireUser()
  const { name } = await parseBody(request, profileSchema, 4096)

  const user = await prisma.user.update({
    where: { id: session.id },
    data: { name: name || null },
    select: { id: true, email: true, name: true, role: true, imageUrl: true },
  })

  return NextResponse.json({ user })
})
