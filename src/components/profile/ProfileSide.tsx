import Link from 'next/link'
import { ClipboardList, KeyRound, LayoutDashboard, LifeBuoy, type LucideIcon } from 'lucide-react'
import type { ProfileUser } from './types'

type Item = { href: string; label: string; help: string; icon: LucideIcon }

/** Where this person usually goes next, and the one security action every account has. */
export function ProfileSide({ user }: { user: ProfileUser }) {
  const staff = user.role !== 'CANDIDATE'
  const items: Item[] = [
    staff
      ? { href: '/admin', label: 'Console', help: 'Examinations, questions and results', icon: LayoutDashboard }
      : { href: '/candidate', label: 'Your examinations', help: 'What is open, upcoming and finished', icon: ClipboardList },
    { href: '/support', label: 'Support', help: 'Ask for help or report a problem', icon: LifeBuoy },
    { href: '/change-password', label: 'Change password', help: 'Choose a new password', icon: KeyRound },
  ]
  return (
    <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      <h2 className="font-display px-1 text-sm font-semibold text-[color:var(--muted)]">Shortcuts</h2>
      <ul className="space-y-2">
        {items.map(({ href, label, help, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="surface-card flex items-start gap-3 p-4 transition-transform hover:-translate-y-0.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-muted)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-[color:var(--muted)]">{help}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
