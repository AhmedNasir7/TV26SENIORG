'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'

export type StaffSupportMessage = {
  id: number
  name: string | null
  email: string
  subject: string
  message: string
  status: string
  response: string | null
  createdAt: string
  respondedBy: { id: number; email: string; name: string | null } | null
}

export function StaffSupportCard({
  item,
  onRespond,
}: {
  item: StaffSupportMessage
  onRespond: (id: number, response: string) => Promise<void>
}) {
  const [responding, setResponding] = useState(false)
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!response.trim()) return
    setSending(true)
    try {
      await onRespond(item.id, response.trim())
      setResponding(false)
      setResponse('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="surface-card p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-[color:var(--foreground)]">{item.subject}</h3>
          <p className="text-sm text-[color:var(--muted)]">
            {item.email}
            {item.name && ` · ${item.name}`}
          </p>
        </div>
        <Badge variant={item.status === 'resolved' ? 'success' : 'accent'}>{item.status}</Badge>
      </div>
      <p className="text-xs text-[color:var(--muted)]">
        {new Date(item.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      <p className="surface-muted mt-3 p-3 text-sm text-[color:var(--foreground)]">{item.message}</p>

      {item.response && (
        <div className="mt-3 rounded-[var(--radius-sm)] p-3" style={{ background: 'var(--success-soft)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--success)' }}>
            Response {item.respondedBy && `by ${item.respondedBy.email}`}
          </p>
          <p className="mt-1 text-sm text-[color:var(--foreground)]">{item.response}</p>
        </div>
      )}

      {item.status !== 'resolved' && !responding && (
        <button onClick={() => setResponding(true)} className="btn-primary mt-4 px-4 py-2 text-sm">
          Respond
        </button>
      )}

      {responding && (
        <div className="mt-4 space-y-2">
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={4}
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="Write your response — this will be emailed to the user"
          />
          <div className="flex gap-2">
            <button onClick={() => setResponding(false)} className="btn-secondary px-4 py-2 text-sm" disabled={sending}>
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !response.trim()}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send response'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
