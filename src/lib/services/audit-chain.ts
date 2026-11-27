/**
 * Tamper evidence for the audit log. Each entry is sealed with a hash of its content and the previous
 * seal, so editing or deleting a sealed entry breaks every seal after it.
 */
import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'

type Entry = { id: number; action: string; entityType: string | null; entityId: number | null; userId: number | null; metadata: string | null; createdAt: Date; seal: string | null }

const sealOf = (previous: string, e: Entry) =>
  createHash('sha256')
    .update(JSON.stringify([previous, e.id, e.action, e.entityType, e.entityId, e.userId, e.metadata, e.createdAt.toISOString()]))
    .digest('hex')

export async function verifyAuditChain() {
  return prisma.$transaction(
    async (tx) => {
      const entries = await tx.activityLog.findMany({ orderBy: { id: 'asc' }, take: 20_000 })
      let previous = ''
      let sealed = 0
      for (const entry of entries) {
        const expected = sealOf(previous, entry)
        if (entry.seal === null) await tx.activityLog.update({ where: { id: entry.id }, data: { seal: expected } })
        else if (entry.seal !== expected) return { intact: false, checked: sealed, brokenAt: entry.id }
        previous = expected
        sealed += 1
      }
      return { intact: true, checked: sealed, brokenAt: null }
    },
    { isolationLevel: 'Serializable', timeout: 60_000 }
  )
}
