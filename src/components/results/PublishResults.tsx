'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'

export function PublishResults({ examId, published, ready }: { examId: number; published: boolean; ready: boolean }) {
  const router = useRouter()
  const confirm = useConfirm()
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function act() {
    const answer = await confirm(
      published
        ? { title: 'Withdraw results?', body: 'Candidates lose access until you publish again.', action: 'Withdraw', danger: true, reason: { label: 'Why?', minLength: 5 } }
        : { title: 'Publish results?', body: `Candidates see scores and feedback${reveal ? ' with the correct answers' : ''}. Marks are locked.`, action: 'Publish' }
    )
    if (!answer) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/results/publish`, 'POST', published ? { published: false, reason: answer } : { published: true, revealAnswers: reveal })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {!published && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
          Also show candidates the correct answers
        </label>
      )}
      <button type="button" disabled={busy || (!published && !ready)} onClick={act} className={`px-4 py-2.5 disabled:opacity-50 ${published ? 'btn-secondary' : 'btn-primary'}`}>
        {published ? 'Withdraw results' : 'Publish results'}
      </button>
      <ErrorToast message={error} />
    </div>
  )
}
