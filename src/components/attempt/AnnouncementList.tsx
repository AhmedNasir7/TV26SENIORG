import { LocalTime } from '@/components/ui/LocalTime'
import type { Announcement } from '@/lib/services/announcements'

/** Newest first. New messages are announced politely, so typing is never interrupted. */
export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  return (
    <div aria-live="polite">
      {announcements.length > 0 && (
        <section aria-label="Announcements" className="glow-card p-4 text-sm">
          <h2 className="font-display font-semibold">Announcements ({announcements.length})</h2>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {announcements.map((a) => (
              <li key={a.id}>
                <p className="whitespace-pre-wrap break-words">{a.message}</p>
                <p className="text-xs opacity-70"><LocalTime iso={a.createdAt} /></p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
