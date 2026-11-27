import { prisma } from '@/lib/prisma'
import { serverNow } from '@/lib/server/time'

/** Platform-wide numbers for administrators. Sandbox attempts are never counted. */
export async function platformOverview() {
  const now = serverNow()
  const published = { status: 'PUBLISHED' as const }

  const [roles, disabled, draft, upcoming, ongoing, completed, activeAttempts, openIncidents, activities] =
    await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true }, orderBy: { role: 'asc' } }),
      prisma.user.count({ where: { status: 'DISABLED' } }),
      prisma.exam.count({ where: { status: 'DRAFT' } }),
      prisma.exam.count({ where: { ...published, startsAt: { gt: now } } }),
      prisma.exam.count({ where: { ...published, startsAt: { lte: now }, endsAt: { gt: now } } }),
      prisma.exam.count({ where: { ...published, endsAt: { lte: now } } }),
      prisma.attempt.count({ where: { isSandbox: false, status: 'IN_PROGRESS', deadlineAt: { gt: now } } }),
      prisma.incident.count({ where: { reviewedAt: null, attempt: { isSandbox: false } } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
    ])

  return {
    roles: roles.map((group) => ({ role: group.role, count: group._count._all })),
    disabled,
    exams: { draft, upcoming, ongoing, completed },
    activeAttempts,
    openIncidents,
    activities,
  }
}
