'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'
import type { ownDisputes } from '@/lib/services/disputes'

type Props = {
  examId: number
  questions: Array<{ id: number; position: number }>
  disputes: Awaited<ReturnType<typeof ownDisputes>>
}

export function CandidateDisputes({ examId, questions, disputes }: Props) {
  const router = useRouter()
  const confirm = useConfirm()
  const [error, setError] = useState('')
  const raised = new Set(disputes.map((d) => d.attemptQuestionId))
  const open = questions.filter((q) => !raised.has(q.id))
  const [selected, setSelected] = useState(open[0]?.id ?? 0)
  const position = (id: number) => questions.find((q) => q.id === id)?.position

  async function raise() {
    const reason = await confirm({
      title: `Dispute question ${position(selected)}?`,
      body: 'Your examiner will read your explanation and answer with a reason.',
      action: 'Send dispute',
      reason: { label: 'What do you think is wrong?', minLength: 15 },
    })
    if (!reason) return
    setError('')
    try {
      await apiRequest(`/api/me/exams/${examId}/disputes`, 'POST', { attemptQuestionId: selected, reason })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the dispute')
    }
  }

  return (
    <section className="surface-card mt-5 p-6 text-sm">
      <h2 className="font-display text-lg font-semibold">Question a mark</h2>
      {disputes.map((d) => (
        <p key={d.id} className="hairline-row py-3">
          Question {position(d.attemptQuestionId)} <span className="chip mx-2">{d.status.toLowerCase()}</span>
          {d.response && <span className="block text-[color:var(--muted)]">Examiner: {d.response}</span>}
        </p>
      ))}
      {open.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            Question
            <select value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="input-clean px-3 py-2">
              {open.map((q) => <option key={q.id} value={q.id}>{q.position}</option>)}
            </select>
          </label>
          <button type="button" onClick={raise} className="btn-secondary px-4 py-2">Raise a dispute</button>
        </div>
      )}
      <p className="mt-3 text-[color:var(--muted)]">Disputes close seven days after results are published.</p>
      <ErrorToast message={error} />
    </section>
  )
}
