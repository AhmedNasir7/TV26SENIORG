'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { UserNotificationsBell } from '@/components/notifications/UserNotificationsBell'
import { APP_NAME } from '@/lib/config'
import { roleLabel, type Role } from '@/lib/roles'

const navItems: Array<{ href: string; label: string; roles: Role[] }> = [
  { href: '/admin', label: 'Overview', roles: ['ADMIN'] },
  { href: '/examiner', label: 'Examinations', roles: ['ADMIN', 'EXAMINER'] },
  { href: '/admin/users', label: 'Users', roles: ['ADMIN'] },
  { href: '/admin/audit-logs', label: 'Audit logs', roles: ['ADMIN'] },
  { href: '/admin/support', label: 'Support', roles: ['ADMIN', 'EXAMINER'] },
]

type ConsoleUser = { id: number; email: string; role: Role }

/** Navigation only hides what a role can't use; every page and API enforces access on the server. */
export function ConsoleShell({ user, children }: { user: ConsoleUser; children: React.ReactNode }) {
  const { logout } = useAuth()
  const pathname = usePathname()
  const items = navItems.filter((item) => item.roles.includes(user.role))
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`))

  return (
    <div className="page-shell flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[var(--border)] bg-[color:var(--surface)] md:w-60 md:border-b-0 md:border-r">
        <div className="border-b border-[var(--border)] p-4 md:p-6">
          <Link href="/" className="font-display text-lg font-semibold">
            {APP_NAME}
          </Link>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">{roleLabel(user.role)} console</p>
        </div>
        <nav aria-label="Console" className="flex flex-1 gap-1 overflow-x-auto p-3 md:flex-col">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-[var(--accent-soft)] text-[color:var(--accent-strong)]'
                  : 'text-[color:var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[color:var(--foreground)]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-4">
          <p className="truncate px-1 pb-2 text-sm text-[color:var(--muted)]">{user.email}</p>
          <div className="flex gap-2">
            <Link href="/profile" className="btn-secondary flex-1 px-3 py-2 text-sm">
              Profile
            </Link>
            <button type="button" onClick={logout} className="btn-danger flex-1 px-3 py-2 text-sm">
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[color:var(--surface)] px-6 py-3.5">
          <p className="font-display text-base font-semibold">
            {items.find((item) => isActive(item.href))?.label ?? 'Console'}
          </p>
          <UserNotificationsBell userId={user.id} />
        </div>
        {children}
      </main>
    </div>
  )
}
