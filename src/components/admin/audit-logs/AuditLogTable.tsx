import { formatActivityAction } from '@/lib/activity-format'

export type AuditLogEntry = {
  id: number
  action: string
  entityType: string | null
  entityId: number | null
  metadata: string | null
  createdAt: string
  user: { id: number; email: string; name: string | null; role: string } | null
}

export function AuditLogTable({ logs, loading }: { logs: AuditLogEntry[]; loading: boolean }) {
  if (loading) {
    return <div className="surface-card p-10 text-center text-sm text-[color:var(--muted)]">Loading audit logs...</div>
  }

  if (logs.length === 0) {
    return (
      <div className="surface-card p-10 text-center">
        <h2 className="font-display text-lg font-semibold text-[color:var(--foreground)]">No matching entries</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Try adjusting or clearing the filters.</p>
      </div>
    )
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className="text-left text-sm font-medium text-[color:var(--muted)]"
              style={{ background: 'var(--surface-muted)' }}
            >
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const metadata = log.metadata ? JSON.parse(log.metadata) : {}
              return (
                <tr key={log.id} className="hairline-row text-[color:var(--foreground)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatActivityAction(log.action)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--muted)]">
                    {log.user ? log.user.email : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--muted)]">
                    {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--muted)]">
                    {metadata.title || metadata.event || ''}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-[color:var(--muted)]">
                    {new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
