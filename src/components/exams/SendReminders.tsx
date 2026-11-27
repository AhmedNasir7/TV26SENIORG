'use client'

import { BellRing } from 'lucide-react'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

/** Sends the reminder email and notification to every enrolled candidate who has not started. */
export function SendReminders({ examId }: { examId: number }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function send() {
    setBusy(true)
    setNote('')
    try {
      const result = await apiRequest<{ notified: number; emailed: number }>(`/api/exams/${examId}/reminders`, 'POST')
      setNote(`Notified ${result.notified} candidate${result.notified === 1 ? '' : 's'}; ${result.emailed} email${result.emailed === 1 ? '' : 's'} sent.`)
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not send reminders')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <p className="max-w-xl text-[color:var(--muted)]">Reminders also go out automatically. Use this to remind everyone who has not started right now.</p>
      <div className="flex items-center gap-3">
        {note && <span role="status">{note}</span>}
        <button type="button" onClick={() => void send()} disabled={busy} className="btn-secondary px-4 py-2 disabled:opacity-60">
          <BellRing className="h-4 w-4" aria-hidden="true" /> {busy ? 'Sending...' : 'Send reminders now'}
        </button>
      </div>
    </div>
  )
}
