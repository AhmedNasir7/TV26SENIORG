import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { formatActivityAction, formatTimeAgo } from '@/lib/activity-format'
import { requirePageUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { roleLabel } from '@/lib/roles'

export default async function AdminDashboardPage() {
  // Account counts and the activity log contain personal information: administrators only.
  await requirePageUser(['ADMIN'])

  const [userCounts, activities] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    }),
  ])

  return (
    <div className="p-8">
      <PageHeader eyebrow="Dashboard" title="Overview" description="Accounts and recent platform activity." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {userCounts.map((group) => (
          <StatTile key={group.role} label={`${roleLabel(group.role)} accounts`} value={group._count._all} />
        ))}
      </div>

      <section className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Recent activity</h2>
          <Link href="/admin/audit-logs" className="link-accent text-xs">
            View all
          </Link>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No activity yet.</p>
        ) : (
          <ul>
            {activities.map((activity) => (
              <li key={activity.id} className="hairline-row flex justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{formatActivityAction(activity.action)}</span>
                  {activity.user && <span className="text-[color:var(--muted)]"> · {activity.user.email}</span>}
                </span>
                <span className="shrink-0 text-xs text-[color:var(--muted)]">{formatTimeAgo(activity.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
