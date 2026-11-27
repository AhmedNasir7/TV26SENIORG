'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

export function PublishResults({ examId, published, ready }: { examId: number; published: boolean; ready: boolean }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send(body: { published: boolean; reason?: string }) {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/results/publish`, 'POST', body)
      setConfirming(false)
      setReason('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {!confirming ? (
        <button type="button" disabled={!published && !ready} onClick={() => setConfirming(true)} className={`px-4 py-2 disabled:opacity-50 ${published ? 'btn-secondary' : 'btn-primary'}`}>
          {published ? 'Withdraw results' : 'Publish results'}
        </button>
      ) : published ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send({ published: false, reason })
          }}
          className="space-y-2"
        >
          <label className="block">
            <span className="mb-1 block font-medium">Why are the results being withdrawn?</span>
            <input required minLength={5} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input-clean w-full max-w-md px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || reason.trim().length < 5} className="btn-danger px-4 py-2 disabled:opacity-50">Withdraw now</button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost px-3 py-2">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p>Candidates will see their scores and feedback, and be notified. Marks are locked while published.</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => send({ published: true })} className="btn-primary px-4 py-2">
              {busy ? 'Publishing...' : 'Publish now'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost px-3 py-2">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
