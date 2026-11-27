import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProfileTab } from './types'

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
]

/** A segmented control: the current tab is a raised pill, so it reads as a choice and not a link. */
export function ProfileTabs() {
  return (
    <TabsList className="mb-6 inline-flex h-auto w-auto gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className="rounded-lg border-0 px-5 py-2 text-sm font-medium text-[color:var(--muted)] data-active:bg-[var(--surface)] data-active:text-[color:var(--foreground)] data-active:shadow-[var(--shadow-sm)]"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
