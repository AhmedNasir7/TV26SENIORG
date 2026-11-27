'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { UserNotificationsBell } from '@/components/notifications/UserNotificationsBell'
import { APP_NAME } from '@/lib/config'
import { isStaff } from '@/lib/roles'

const serviceLinks = [
  { href: '/chat', label: 'Community' },
  { href: '/meeting', label: 'Meetings' },
  { href: '/support', label: 'Support' },
]

export function AppHeader() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:var(--surface)]">
      <div className="content-wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-base font-semibold tracking-tight">
          {APP_NAME}
        </Link>

        {user && (
          <nav aria-label="Account" className="flex items-center gap-2">
            <UserNotificationsBell userId={user.id} />
            {serviceLinks.map((item) => (
              <Link key={item.href} href={item.href} className="btn-ghost hidden px-3 py-2 text-sm md:inline-flex">
                {item.label}
              </Link>
            ))}
            {isStaff(user.role) && (
              <Link href="/admin" className="btn-ghost px-3 py-2 text-sm">
                Console
              </Link>
            )}
            <Link href="/profile" className="btn-ghost px-3 py-2 text-sm">
              Profile
            </Link>
            <button type="button" onClick={logout} className="btn-secondary px-3 py-2 text-sm">
              Sign out
            </button>
          </nav>
        )}
      </div>
    </header>
  )
}
