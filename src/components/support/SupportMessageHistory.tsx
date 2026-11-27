import { Badge } from '@/components/ui/badge'
import { MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export type SupportMessageItem = {
  id: number
  subject: string
  message: string
  status: string
  response: string | null
  createdAt: string
}

export function SupportMessageHistory({
  messages,
  loading,
}: {
  messages: SupportMessageItem[]
  loading: boolean
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-[var(--border)] p-6">
        <h2 className="font-display text-lg font-semibold text-[color:var(--foreground)]">Your messages</h2>
        <p className="mt-0.5 text-sm text-[color:var(--muted)]">Past support requests and our responses</p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-[color:var(--muted)]">Loading...</div>
      ) : messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages yet" description="Messages you send to support appear here with their replies." />
      ) : (
        <div>
          {messages.map((m) => (
            <div key={m.id} className="hairline-row p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-medium text-[color:var(--foreground)]">{m.subject}</h3>
                <Badge variant={m.status === 'resolved' ? 'success' : 'accent'}>{m.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                {new Date(m.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{m.message}</p>
              {m.response && (
                <div className="surface-muted mt-3 p-3">
                  <p className="text-xs font-medium text-[color:var(--foreground)]">Response</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{m.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
