import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { parseBody, parseInput, route } from '@/lib/server/api'
import { listChat, postChat } from '@/lib/services/exam-chat'
import { idSchema } from '@/lib/validation/users'

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { 'Cache-Control': 'private, no-store' }
const schema = z.strictObject({ content: z.string().trim().min(1).max(1000), parentId: z.number().int().positive().nullable().optional() })

/** Staff of the examination and its enrolled candidates; the service decides which. */
export const GET = route(async (_request: Request, { params }: Context) => {
  const actor = await requireUser()
  return NextResponse.json(await listChat(actor, parseInput((await params).id, idSchema)), { headers: NO_STORE })
})

export const POST = route(async (request: Request, { params }: Context) => {
  const actor = await requireUser()
  const examId = parseInput((await params).id, idSchema)
  const { content, parentId } = await parseBody(request, schema, 8_192)
  return NextResponse.json(await postChat(actor, examId, content, parentId ?? null), { status: 201, headers: NO_STORE })
})
