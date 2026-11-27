'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { storeSession } from '@/components/attempt/session'
import { apiRequest } from '@/lib/client/request'

type Props = { examId: number; durationMinutes: number; hasAttempt: boolean }

export function SandboxControls({ examId, durationMinutes, hasAttempt }: Props) {
  const router = useRouter()
  const [minutes, setMinutes] = useState(String(durationMinutes))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  const start = (event: React.FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const result = await apiRequest<{ sessionId: string }>(`/api/exams/${examId}/sandbox`, 'POST', { minutes: Number(minutes) })
      storeSession(examId, result.sessionId, true)
    })
  }

  return (
    <form onSubmit={start} className="surface-card flex flex-wrap items-end gap-3 p-5 text-sm">
      <label>
        <span className="mb-1 block font-medium">Time limit in minutes (up to {durationMinutes})</span>
        <input type="number" required min={1} max={durationMinutes} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input-clean w-32 px-3 py-2" />
      </label>
      <button type="submit" disabled={busy} className="btn-primary px-4 py-2 disabled:opacity-60">
        {hasAttempt ? 'Start a fresh trial' : 'Start trial'}
      </button>
      {hasAttempt && (
        <button type="button" disabled={busy} onClick={() => run(() => apiRequest(`/api/exams/${examId}/sandbox`, 'DELETE'))} className="btn-ghost px-3 py-2">
          Discard trial
        </button>
      )}
      <p className="w-full text-[color:var(--muted)]">Set 1 minute to show what happens when time runs out.</p>
      <ErrorToast message={error} />
    </form>
  )
}
