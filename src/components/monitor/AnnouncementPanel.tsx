'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { toast } from '@/components/ui/ToasterProvider'
import { useState } from 'react'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import type { Announcement } from '@/lib/services/announcements'

export function AnnouncementPanel({ examId, initial, canSend }: { examId: number; initial: Array<Announcement & { to?: string | null; readBy?: number }>; canSend: boolean }) {
  const [sent, setSent] = useState(initial)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { announcement } = await apiRequest<{ announcement: Announcement }>(`/api/exams/${examId}/announcements`, 'POST', { message })
      setSent((list) => [announcement, ...list])
      setMessage('')
      toast.success('Announcement sent', { description: 'Running candidates receive it within seconds.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Announcements" className="surface-card space-y-3 p-5 text-sm">
      <h2 className="font-display font-semibold">Announcements</h2>
      {canSend ? (
        <form onSubmit={send} className="space-y-2">
          <label className="block">
            <span className="mb-1 block font-medium">Message to every candidate</span>
            <textarea required rows={2} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} className="input-clean w-full px-3 py-2" />
          </label>
          <button type="submit" disabled={busy || !message.trim()} className="btn-primary px-4 py-2 disabled:opacity-50">
            {busy ? 'Sending...' : 'Send announcement'}
          </button>
        </form>
      ) : (
        <p className="text-[color:var(--muted)]">Publish the examination to send messages.</p>
      )}
      <ErrorToast message={error} />
      <ul className="space-y-2">
        {sent.map((a) => (
          <li key={a.id} className="hairline-row pb-2">
            <p className="whitespace-pre-wrap break-words">{a.message}</p>
            <p className="text-xs text-[color:var(--muted)]">
              <LocalTime iso={a.createdAt} />
              {'to' in a && a.to ? ` · to ${a.to}` : ''}
              {'readBy' in a && a.readBy !== undefined ? ` · read by ${a.readBy}` : ''}
            </p>
          </li>
        ))}
        {sent.length === 0 && <li className="text-[color:var(--muted)]">Nothing sent yet.</li>}
      </ul>
    </section>
  )
}
