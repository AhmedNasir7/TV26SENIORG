'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'
import type { examDisputes } from '@/lib/services/disputes'

type Dispute = Awaited<ReturnType<typeof examDisputes>>[number]

/** Gives everyone full marks for a faulty question, after a popup asks why. */
export function VoidButton({ examId, questionVersionId }: { examId: number; questionVersionId: number }) {
  const router = useRouter()
  const confirm = useConfirm()
  const [error, setError] = useState('')

  async function run() {
    const reason = await confirm({
      title: 'Void this question?',
      body: 'Everyone who received it gets full marks. This is recorded.',
      action: 'Void question',
      danger: true,
      reason: { label: 'Reason', minLength: 5 },
    })
    if (!reason) return
    try {
      await apiRequest(`/api/exams/${examId}/void`, 'POST', { questionVersionId, reason })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not void the question')
    }
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={run} className="btn-danger px-3 py-1.5 text-sm">Void question</button>
      {error && <p role="alert" className="mt-2" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

function DisputeRow({ examId, dispute }: { examId: number; dispute: Dispute }) {
  const router = useRouter()
  const [response, setResponse] = useState('')
  const [marks, setMarks] = useState(String(dispute.marks ?? ''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function answer(accept: boolean) {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/disputes/${dispute.id}`, 'POST', { accept, response, ...(accept && marks !== '' && { marks: Number(marks) }) })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
      <p className="font-medium">{dispute.candidate} <span className="chip ml-2">{dispute.status.toLowerCase()}</span></p>
      <p className="mt-1 text-[color:var(--muted)]">{dispute.question}</p>
      <p className="mt-2 whitespace-pre-wrap">“{dispute.reason}”</p>
      {dispute.status === 'OPEN' ? (
        <div className="mt-3 space-y-3">
          <textarea aria-label="Your answer" rows={2} maxLength={1000} placeholder="Your answer to the candidate" value={response} onChange={(e) => setResponse(e.target.value)} className="input-clean w-full px-3 py-2" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Marks (of {dispute.maximum})
              <input type="number" min={0} max={dispute.maximum} step="0.01" value={marks} onChange={(e) => setMarks(e.target.value)} className="input-clean w-24 px-3 py-2" />
            </label>
            <button type="button" disabled={busy || response.trim().length < 5} onClick={() => answer(true)} className="btn-primary px-4 py-2 disabled:opacity-50">Accept and correct</button>
            <button type="button" disabled={busy || response.trim().length < 5} onClick={() => answer(false)} className="btn-secondary px-4 py-2 disabled:opacity-50">Decline</button>
          </div>
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      ) : (
        <p className="mt-2">Answer: {dispute.response}</p>
      )}
    </li>
  )
}

export function Disputes({ examId, disputes }: { examId: number; disputes: Dispute[] }) {
  if (!disputes.length) return null
  return (
    <section className="surface-card p-6 text-sm">
      <h2 className="font-display text-lg font-semibold">Disputes</h2>
      <ul className="mt-4 space-y-3">
        {disputes.map((d) => <DisputeRow key={`${d.id}-${d.status}`} examId={examId} dispute={d} />)}
      </ul>
    </section>
  )
}
