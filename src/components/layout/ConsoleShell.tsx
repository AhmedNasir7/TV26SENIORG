'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  ClipboardList, LayoutDashboard, Library, LifeBuoy, LogOut, PanelLeftClose, PanelLeftOpen, MessagesSquare, ScrollText, Upload, UserRound, Users, Video, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/hooks/useSidebar'
import { LogoMark } from '@/components/layout/LogoMark'
import { UserNotificationsBell } from '@/components/notifications/UserNotificationsBell'
import { BrandMark } from '@/components/layout/BrandMark'
import { CommandMenu, type CommandItem } from '@/components/layout/CommandMenu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { roleLabel, type Role } from '@/lib/roles'

const navItems: Array<{ href: string; label: string; roles: Role[]; icon: LucideIcon }> = [
  { href: '/admin', label: 'Overview', roles: ['ADMIN'], icon: LayoutDashboard },
  { href: '/examiner', label: 'Examinations', roles: ['ADMIN', 'EXAMINER'], icon: ClipboardList },
  { href: '/examiner/questions', label: 'Question bank', roles: ['ADMIN', 'EXAMINER'], icon: Library },
  { href: '/examiner/import', label: 'Import', roles: ['ADMIN', 'EXAMINER'], icon: Upload },
  { href: '/admin/users', label: 'Users', roles: ['ADMIN'], icon: Users },
  { href: '/admin/audit-logs', label: 'Audit logs', roles: ['ADMIN'], icon: ScrollText },
  { href: '/admin/support', label: 'Support', roles: ['ADMIN', 'EXAMINER'], icon: LifeBuoy },
]

// Pages every signed-in user can open, offered in the command menu
const sharedPages: CommandItem[] = [
  { label: 'Community chat', href: '/chat', icon: MessagesSquare, group: 'Go to' },
  { label: 'Meetings', href: '/meeting', icon: Video, group: 'Go to' },
  { label: 'Profile', href: '/profile', icon: UserRound, group: 'Go to' },
]

type ConsoleUser = { id: number; email: string; role: Role }

/** Navigation only hides what a role can't use; every page and API enforces access on the server. */
export function ConsoleShell({ user, children }: { user: ConsoleUser; children: React.ReactNode }) {
  const { logout } = useAuth()
  const { collapsed, toggle } = useSidebar()
  const pathname = usePathname()
  const items = navItems.filter((item) => item.roles.includes(user.role))
  // The most specific matching entry wins, so "/examiner/questions" doesn't also highlight "/examiner"
  const activeHref = items
    .map((item) => item.href)
    .filter((href) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0]
  const isActive = (href: string) => href === activeHref
  const commandPages = useMemo<CommandItem[]>(
    () => [...navItems.filter((item) => item.roles.includes(user.role)).map(({ href, label, icon }) => ({ href, label, icon, group: 'Go to' as const })), ...sharedPages],
    [user.role]
  )

  return (
    <div className="page-shell flex min-h-screen flex-col md:flex-row">
      <aside
        data-collapsed={collapsed}
        className="side-panel flex shrink-0 flex-col border-b border-[var(--border)] bg-[color:var(--surface)] md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r"
      >
        <div className="flex h-[61px] items-center justify-between gap-2 border-b border-[var(--border)] px-4">
          {collapsed ? (
            <>
              <span className="md:hidden"><BrandMark subtitle={`${roleLabel(user.role)} console`} /></span>
              <button type="button" onClick={toggle} aria-label="Expand side panel" title="Expand" className="side-expand mx-auto hidden h-10 w-10 place-items-center rounded-xl md:grid">
                <LogoMark className="brand-logo h-8 w-8" />
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <BrandMark subtitle={`${roleLabel(user.role)} console`} />
              <button type="button" onClick={toggle} aria-label="Collapse side panel" title="Collapse" className="btn-ghost hidden h-9 w-9 md:inline-flex">
                <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
        <nav aria-label="Console" className="flex flex-1 gap-1 overflow-x-auto p-3 md:flex-col">
          <p className="side-label hidden px-3 pb-1.5 pt-1 text-xs text-[color:var(--muted)] md:block">Workspace</p>
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className="nav-item side-item relative flex items-center gap-3 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium"
              >
                {active && <motion.span layoutId="side-active" className="side-active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon className="relative h-[18px] w-[18px]" aria-hidden="true" />
                <span className="side-label relative">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div className="side-user flex items-center gap-2.5 px-1 pb-3">
            <span title={user.email} className="glow-card grid h-8 w-8 shrink-0 place-items-center rounded-full! text-xs font-semibold uppercase" aria-hidden="true">
              {user.email.slice(0, 1)}
            </span>
            <span className="side-label min-w-0">
              <span className="block truncate text-sm">{user.email}</span>
              <span className="block text-xs text-[color:var(--muted)]">{roleLabel(user.role)}</span>
            </span>
          </div>
          <div className="side-actions flex gap-2">
            <Link href="/profile" title="Profile" className="btn-secondary flex-1 px-3 py-2 text-sm">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              <span className="side-label">Profile</span>
            </Link>
            <button type="button" onClick={logout} title="Sign out" className="btn-danger flex-1 px-3 py-2 text-sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="side-label">Sign out</span>
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-[61px] items-center justify-between gap-3 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_86%,transparent)] px-6 backdrop-blur-md">
          <p className="font-display truncate text-base font-semibold">
            {items.find((item) => isActive(item.href))?.label ?? 'Console'}
          </p>
          <div className="flex items-center gap-2">
            <CommandMenu pages={commandPages} onSignOut={logout} />
            <UserNotificationsBell userId={user.id} />
            <ThemeToggle />
          </div>
        </div>
        <div className="console-body">{children}</div>
      </main>
    </div>
  )
}
