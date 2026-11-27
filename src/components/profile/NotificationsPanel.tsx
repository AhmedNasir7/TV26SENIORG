import { formatDateTime } from '@/lib/format-date'
import type { NotificationItem } from './types'

export function NotificationsPanel({
  loading,
  notifications,
  onMarkRead,
  onDelete,
}: {
  loading: boolean
  notifications: NotificationItem[]
  onMarkRead: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="border-b border-[var(--border)] p-6">
        <h2 className="font-display text-lg font-semibold text-[color:var(--foreground)]">
          All notifications
        </h2>
        <p className="mt-0.5 text-sm text-[color:var(--muted)]">View your notification history</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-[color:var(--muted)]">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm text-[color:var(--muted)]">No notifications yet</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            When you receive notifications, they&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div>
          {notifications.map((notification) => (
            <div key={notification.id} className="hairline-row p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[color:var(--foreground)]">{notification.title}</h3>
                    {!notification.readAt && (
                      <span
                        className="inline-flex h-1.5 w-1.5 rounded-full"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                    {notification.type && (
                      <span className="chip capitalize">{notification.type.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{notification.message}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3">
                  {!notification.readAt && (
                    <button onClick={() => onMarkRead(notification.id)} className="link-accent text-xs">
                      Mark read
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(notification.id)}
                    className="text-xs font-medium"
                    style={{ color: 'var(--danger)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
