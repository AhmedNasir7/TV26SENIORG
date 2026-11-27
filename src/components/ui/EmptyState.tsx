import { Inbox, type LucideIcon } from 'lucide-react'

/** Friendly empty state: icon tile, short title, one line of help and an optional action. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-[color:var(--foreground)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[color:var(--muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
