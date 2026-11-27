'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { ClipboardList, LayoutDashboard, LifeBuoy, MessagesSquare, UserRound, Video, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { UserNotificationsBell } from '@/components/notifications/UserNotificationsBell'
import { BrandMark } from '@/components/layout/BrandMark'
import { CommandMenu, type CommandItem } from '@/components/layout/CommandMenu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { isStaff } from '@/lib/roles'

const serviceLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/chat', label: 'Community', icon: MessagesSquare },
  { href: '/meeting', label: 'Meetings', icon: Video },
  { href: '/support', label: 'Support', icon: LifeBuoy },
]

export function AppHeader() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const staff = user ? isStaff(user.role) : false
  const current = (href: string) => (pathname === href || pathname.startsWith(`${href}/`) ? 'page' : undefined)

  const commandPages = useMemo<CommandItem[]>(
    () => [
      staff
        ? { label: 'Console', href: '/admin', icon: LayoutDashboard, group: 'Go to' }
        : { label: 'Your examinations', href: '/candidate', icon: ClipboardList, group: 'Go to' },
      ...serviceLinks.map(({ href, label, icon }) => ({ href, label, icon, group: 'Go to' as const })),
      { label: 'Profile', href: '/profile', icon: UserRound, group: 'Go to' },
    ],
    [staff]
  )

  const linkClass = 'btn-ghost gap-1.5 px-3 py-2 text-sm aria-[current=page]:bg-[var(--surface-muted)] aria-[current=page]:text-[color:var(--foreground)]'

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-md">
      <div className="content-wrap flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <BrandMark />

        {user && (
          <nav aria-label="Account" className="flex flex-wrap items-center justify-end gap-1.5">
            <CommandMenu pages={commandPages} onSignOut={logout} />
            <UserNotificationsBell userId={user.id} />
            {serviceLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} aria-current={current(item.href)} className={linkClass}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
            {staff && (
              <Link href="/admin" className={linkClass}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Console
              </Link>
            )}
            <Link href="/profile" aria-current={current('/profile')} className={linkClass}>
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Profile
            </Link>
            <button type="button" onClick={logout} className="btn-secondary px-3 py-2 text-sm">
              Sign out
            </button>
            <ThemeToggle />
          </nav>
        )}
        {!user && <ThemeToggle />}
      </div>
    </header>
  )
}
