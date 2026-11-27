/**
 * The chat of one examination. Staff who manage it and candidates enrolled in it may take part;
 * nobody else can read or write. A candidate who is sitting the examination is kept out until they
 * submit, so the chat can't be used to share answers.
 */
import { notifyUser } from '@/lib/activity'
import { canManageExam, type Actor } from '@/lib/policies'
import { moderateText } from '@/lib/moderation'
import { prisma } from '@/lib/prisma'
import { pingChannel } from '@/lib/pusher/server'
import { ApiError } from '@/lib/server/api'

export const examChatChannel = (examId: number) => `exam-chat-${examId}`

const AUTHOR = { select: { id: true, email: true, name: true, imageUrl: true, role: true } } as const
const MAX_THREAD = 400

async function allowed(actor: Actor, examId: number) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true, ownerId: true, status: true, title: true } })
  if (!exam) throw new ApiError('NOT_FOUND', 'Not found')
  if (actor.role === 'CANDIDATE') {
    const enrolled = await prisma.enrollment.findFirst({ where: { examId, candidateId: actor.id }, select: { id: true } })
    if (!enrolled || exam.status !== 'PUBLISHED') throw new ApiError('NOT_FOUND', 'Not found')
    const running = await prisma.attempt.findFirst({ where: { examId, candidateId: actor.id, isSandbox: false, status: 'IN_PROGRESS' }, select: { id: true } })
    if (running) throw new ApiError('CONFLICT', 'The chat is closed while you are taking the examination')
  } else if (!canManageExam(actor, exam)) {
    throw new ApiError('NOT_FOUND', 'Not found')
  }
  return exam
}

/** Everything is returned as one flat list; the screen groups replies under their parents. */
export async function listChat(actor: Actor, examId: number) {
  await allowed(actor, examId)
  const rows = await prisma.chatMessage.findMany({
    where: { examId },
    orderBy: { createdAt: 'asc' },
    take: MAX_THREAD,
    include: { author: AUTHOR },
  })
  type Author = { id: number; email: string; name: string | null; imageUrl: string | null; role: string }
  type Node = { id: number; content: string; authorId: number; parentId: number | null; createdAt: Date; author: Author; replies: Node[] }
  const nodes = new Map<number, Node>()
  for (const row of rows) {
    nodes.set(row.id, { id: row.id, content: row.content, authorId: row.authorId, parentId: row.parentId, createdAt: row.createdAt, author: row.author as Author, replies: [] })
  }
  const top: Node[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId)
    if (parent) parent.replies.push(node)
    else top.push(node)
  }
  return { messages: top }
}

export async function postChat(actor: Actor, examId: number, content: string, parentId: number | null) {
  const exam = await allowed(actor, examId)
  const text = content.trim()
  if (!text) throw new ApiError('BAD_REQUEST', 'Write a message first')
  if ((await moderateText(text)).flagged) throw new ApiError('BAD_REQUEST', 'That message breaks the chat rules')

  let parentAuthor: number | null = null
  if (parentId !== null) {
    const parent = await prisma.chatMessage.findFirst({ where: { id: parentId, examId }, select: { authorId: true } })
    if (!parent) throw new ApiError('BAD_REQUEST', 'The message you replied to no longer exists')
    parentAuthor = parent.authorId
  }
  const message = await prisma.chatMessage.create({ data: { content: text, authorId: actor.id, parentId, examId }, include: { author: AUTHOR } })
  if (parentAuthor && parentAuthor !== actor.id) {
    await notifyUser({
      userId: parentAuthor,
      title: 'New reply in an examination chat',
      message: `${message.author.name || message.author.email} replied in "${exam.title}".`,
      type: 'chat_reply',
      entityType: 'exam',
      entityId: examId,
    })
  }
  await pingChannel(examChatChannel(examId), 'new-message')
  return { message: { ...message, replies: [] } }
}
