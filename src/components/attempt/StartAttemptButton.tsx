'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { readSession, storeSession } from './session'

export function StartAttemptButton({ examId, running }: { examId: number; running: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function open() {
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ sessionId: string }>(`/api/me/exams/${examId}/attempt`, 'POST', {
        start: true,
        sessionId: readSession(examId),
      })
      storeSession(examId, result.sessionId)
      router.push(`/candidate/exams/${examId}/attempt`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start')
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {confirming && !running && (
        <p className="text-sm">Once you start, the timer runs on the server and cannot be paused.</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => (running || confirming ? open() : setConfirming(true))}
        className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {busy ? 'Opening...' : running ? 'Resume attempt' : confirming ? 'Start now' : 'Start attempt'}
      </button>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
