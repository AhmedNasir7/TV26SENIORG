/** Publications, withdrawals and mark changes of one examination, read from the audit log. */
import { prisma } from '@/lib/prisma'

export async function resultHistory(examId: number) {
  const entries = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: 'exam', entityId: examId, action: { in: ['results_published', 'results_unpublished'] } },
        { action: 'answer_graded', metadata: { startsWith: `{"examId":${examId},` } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    select: { id: true, action: true, createdAt: true, metadata: true, entityId: true, user: { select: { name: true, email: true } } },
  })
  return entries.map((entry) => {
    const data = JSON.parse(entry.metadata ?? '{}') as { reason?: string; from?: number | null; to?: number }
    const what =
      entry.action === 'results_published'
        ? 'Published results'
        : entry.action === 'results_unpublished'
          ? `Withdrew results: ${data.reason ?? ''}`
          : `Marked attempt ${entry.entityId}: ${data.from ?? 'unmarked'} to ${data.to}`
    return { id: entry.id, at: entry.createdAt.toISOString(), by: entry.user ? entry.user.name || entry.user.email : 'System', what }
  })
}
