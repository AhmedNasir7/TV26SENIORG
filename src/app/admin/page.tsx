import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { formatActivityAction, formatTimeAgo } from '@/lib/activity-format'
import { requirePageUser } from '@/lib/auth'
import { roleLabel } from '@/lib/roles'
import { platformOverview } from '@/lib/services/overview'

export default async function AdminDashboardPage() {
  // Account counts and the activity log contain personal information: administrators only.
  await requirePageUser(['ADMIN'])
  const { roles, disabled, exams, activeAttempts, openIncidents, activities } = await platformOverview()

  return (
    <div className="space-y-6 p-8">
      <PageHeader eyebrow="Dashboard" title="Overview" description="Accounts, examinations and recent activity." />

      <section aria-label="Accounts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {roles.map((group) => (
          <StatTile key={group.role} label={`${roleLabel(group.role)} accounts`} value={group.count} />
        ))}
        <StatTile label="Disabled accounts" value={disabled} tone="muted" />
      </section>

      <section aria-label="Examinations" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Open now" value={exams.ongoing} tone="success" />
        <StatTile label="Upcoming" value={exams.upcoming} />
        <StatTile label="Completed" value={exams.completed} tone="muted" />
        <StatTile label="Drafts" value={exams.draft} tone="muted" />
        <StatTile label="Attempts in progress" value={activeAttempts} tone="success" />
        <StatTile label="Incidents to review" value={openIncidents} />
      </section>

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
