'use client'

import { useCallback, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import type { Attempt } from './types'
import { useDeadline } from './useDeadline'

function clock(ms: number) {
  const total = Math.ceil(ms / 1000)
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

type Props = { attempt: Attempt; sessionId: string; onChange: (attempt: Attempt) => void }

export function RunningAttempt({ attempt, sessionId, onChange }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ attempt: Attempt }>(`/api/attempts/${attempt.id}/submit`, 'POST', { sessionId })
      onChange(result.attempt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit. Check your connection and try again.')
      setBusy(false)
    }
  }, [attempt.id, sessionId, onChange])

  const remaining = useDeadline(attempt.id, attempt, submit)

  return (
    <>
      <div className="surface-card sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4">
        <h1 className="font-display text-lg font-semibold">{attempt.exam.title}</h1>
        <p className="text-sm">
          Time left <span role="timer" className="stat-figure tabular-nums text-xl font-semibold">{clock(remaining)}</span>
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {attempt.questions.map((q) => (
          <li key={q.id} className="surface-card p-5">
            <p className="text-xs text-[color:var(--muted)]">Question {q.position} · {q.marks} marks</p>
            <p className="mt-1 whitespace-pre-wrap">{q.text}</p>
            {q.options.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-sm">
                {q.options.map((o) => <li key={o.key}>{o.text}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-[color:var(--muted)]">Answer controls arrive with the next build step.</p>

      {error && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={busy} onClick={() => (confirming ? submit() : setConfirming(true))} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
          {busy ? 'Submitting...' : confirming ? 'Yes, submit now' : 'Submit attempt'}
        </button>
        {confirming && !busy && (
          <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-4 py-2.5 text-sm">Keep working</button>
        )}
      </div>
    </>
  )
}
