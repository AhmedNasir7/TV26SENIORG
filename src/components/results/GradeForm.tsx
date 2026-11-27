'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

type Props = {
  examId: number
  answer: { id: number; maximum: number; marks: number | null; feedback: string; version: number }
  locked: boolean
}

export function GradeForm({ examId, answer, locked }: Props) {
  const router = useRouter()
  const [marks, setMarks] = useState(answer.marks === null ? '' : String(answer.marks))
  const [feedback, setFeedback] = useState(answer.feedback)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const value = Number(marks)
    if (marks.trim() === '' || !Number.isFinite(value) || value < 0 || value > answer.maximum) {
      return setError(`Enter marks from 0 to ${answer.maximum}`)
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await apiRequest(`/api/exams/${examId}/grading/${answer.id}`, 'PUT', { marks: value, feedback, expectedVersion: answer.version })
      setMessage('Saved')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the mark')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3">
      <fieldset disabled={locked || busy} className="flex flex-wrap items-end gap-3 disabled:opacity-70">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Marks (0 to {answer.maximum})</span>
          <input type="number" min={0} max={answer.maximum} step="0.01" value={marks} onChange={(e) => setMarks(e.target.value)} className="input-clean w-32 px-3 py-2" />
        </label>
        <label className="min-w-56 flex-1 text-sm">
          <span className="mb-1 block font-medium">Feedback (optional)</span>
          <textarea rows={2} maxLength={2000} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="input-clean w-full px-3 py-2" />
        </label>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">{busy ? 'Saving...' : 'Save mark'}</button>
      </fieldset>
      {message && <p role="status" className="text-sm" style={{ color: 'var(--success)' }}>{message}</p>}
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  )
}
