'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import type { Enrollment } from './EnrollmentManager'

export function ExtraTimeForm({ examId, enrollment, onSaved }: { examId: number; enrollment: Enrollment; onSaved: () => void }) {
  const [minutes, setMinutes] = useState(String(enrollment.extraMinutes || 15))
  const [reason, setReason] = useState(enrollment.extraReason ?? '')
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/enrollments/${enrollment.id}`, 'PATCH', {
        extraMinutes: Number(minutes),
        reason: reason || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="number" min="0" max="600" required aria-label="Extra minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input-clean w-24 px-2 py-1.5 text-sm" />
      <input aria-label="Reason for extra time" placeholder="Reason (recorded)" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input-clean min-w-48 flex-1 px-2 py-1.5 text-sm" />
      <button type="submit" className="btn-secondary px-3 py-1.5 text-xs">Save</button>
      <ErrorToast message={error} />
    </form>
  )
}
