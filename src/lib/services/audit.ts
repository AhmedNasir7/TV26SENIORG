import type { Prisma } from '@/generated/prisma/client'
import type { ActivityAction } from '@/lib/activity'

/** Audit entry written inside the caller's transaction, so a change and its record can't drift apart. */
export function audit(
  tx: Prisma.TransactionClient,
  actorId: number,
  action: ActivityAction,
  entityType: 'user' | 'question' | 'exam',
  entityId: number,
  metadata: Prisma.InputJsonObject = {}
) {
  return tx.activityLog.create({
    data: { action, entityType, entityId, userId: actorId, metadata: JSON.stringify(metadata) },
  })
}
