'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'
import { readSession, storeSession } from './session'

export function StartAttemptButton({ examId, running }: { examId: number; running: boolean }) {
  const router = useRouter()
  const confirm = useConfirm()
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
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (running || (await confirm({ title: 'Start the examination?', body: 'The timer runs on the server and cannot be paused.', action: 'Start now' }))) void open()
        }}
        className="btn-primary px-6 py-3 text-sm disabled:opacity-60"
      >
        {busy ? 'Opening...' : running ? 'Resume attempt' : 'Start attempt'}
      </button>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
