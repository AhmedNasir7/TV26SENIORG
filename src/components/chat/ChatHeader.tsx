import Link from 'next/link'

export function ChatHeader({ messageCount, signedIn }: { messageCount: number; signedIn: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[color:var(--foreground)] md:text-3xl">
            Community chat
          </h1>
          <span className="chip">
            {messageCount} {messageCount === 1 ? 'message' : 'messages'}
          </span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--muted)]">Join the conversation. Reply to threads.</p>
      </div>
      {!signedIn && (
        <Link href="/login" className="btn-primary whitespace-nowrap px-4 py-2.5 text-sm">
          Sign in
        </Link>
      )}
    </div>
  )
}
