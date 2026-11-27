import { prisma } from '@/lib/prisma'
import { canManageQuestion, ensureFound, type Actor } from '@/lib/policies'

/** Examiners see their own topics; administrators see every owner's. */
export function listTopics(actor: Actor) {
  return prisma.topic.findMany({
    where: actor.role === 'ADMIN' ? {} : { ownerId: actor.id },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, ownerId: true, owner: { select: { email: true } }, _count: { select: { questions: true } } },
  })
}

// A duplicate name for the same owner violates the unique constraint and becomes a 409
export function createTopic(actor: Actor, name: string) {
  return prisma.topic.create({ data: { ownerId: actor.id, name }, select: { id: true, name: true, ownerId: true } })
}

export async function renameTopic(actor: Actor, topicId: number, name: string) {
  ensureFound(await prisma.topic.findUnique({ where: { id: topicId } }), (t) => canManageQuestion(actor, t))
  return prisma.topic.update({ where: { id: topicId }, data: { name }, select: { id: true, name: true, ownerId: true } })
}
