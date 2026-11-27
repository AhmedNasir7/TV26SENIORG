import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { parseInput, route } from '@/lib/server/api'
import { resetPassword } from '@/lib/services/users'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (_request: Request, { params }: Context) => {
  const admin = await requireUser(['ADMIN'])
  const id = parseInput((await params).id, idSchema)
  return NextResponse.json(await resetPassword(admin.id, id), {
    headers: { 'Cache-Control': 'private, no-store' },
  })
})
