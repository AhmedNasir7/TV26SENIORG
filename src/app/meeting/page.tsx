import { Suspense } from 'react'
import MeetingPageClient from './MeetingPageClient'

export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="text-lg font-semibold text-[color:var(--foreground)]">Loading...</div>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2" style={{ borderColor: 'var(--accent)' }} />
          </div>
        </div>
      }
    >
      <MeetingPageClient />
    </Suspense>
  )
}
