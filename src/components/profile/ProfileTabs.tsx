import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ProfileTab } from './types'

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
]

export function ProfileTabs() {
  return (
    <TabsList
      variant="line"
      className="mb-6 h-auto w-full justify-start gap-0 border-b border-[var(--border)] bg-transparent p-0"
    >
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          className="rounded-none border-0 px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] after:bg-[var(--accent)] data-active:bg-transparent data-active:text-[color:var(--accent-strong)] data-active:shadow-none"
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
