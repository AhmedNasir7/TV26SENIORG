'use client'

import { ErrorToast, SuccessToast } from '@/components/ui/Notify'
import { toast } from '@/components/ui/ToasterProvider'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import type { Timeline } from '@/lib/services/monitor'

type Props = {
  examId: number
  attemptId: number
  candidate: { candidateId: number; state: string } | undefined
  onClose: () => void
  onReviewed: () => void
}
type Incident = Timeline['incidents'][number]

function measures({ details }: Incident) {
  const parts: string[] = []
  if (details.totalSeconds !== undefined) parts.push(`${details.totalSeconds} s in total, longest ${details.longestSeconds ?? 0} s`)
  if (details.totalCharacters !== undefined) parts.push(`${details.totalCharacters} characters`)
  return parts.join(' · ')
}

export function AttemptTimeline({ examId, attemptId, candidate, onClose, onReviewed }: Props) {
  const confirm = useConfirm()
  const [done, setDone] = useState('')
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)

  const load = useCallback(
    () =>
      apiRequest<Timeline>(`/api/exams/${examId}/monitor/${attemptId}`)
        .then(setTimeline)
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not load')),
    [examId, attemptId]
  )

  useEffect(() => {
    void load()
    const timer = setInterval(load, 10_000)
    return () => clearInterval(timer)
  }, [load])

  const loaded = timeline !== null
  useEffect(() => {
    if (loaded) heading.current?.focus()
  }, [loaded])

  async function act(title: string, action: string, path: string, body: (reason: string) => unknown, danger = false) {
    const reason = await confirm({ title, action, danger, reason: { label: danger ? 'Reason (sent to the candidate)' : 'Message', minLength: 5 } })
    if (!reason) return
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/${path}`, 'POST', body(reason))
      setDone('')
      toast.success(danger ? 'Attempt submitted' : 'Message sent')
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    }
  }

  async function review(id: number) {
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/incidents/${id}`, 'PATCH', { note: notes[id] ?? '' })
      await load()
      onReviewed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the review')
    }
  }

  return (
    <section aria-label="Attempt indicators" className="surface-card space-y-3 p-5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="font-display font-semibold">
          {timeline ? `Indicators for ${timeline.candidate}` : 'Loading...'}
        </h2>
        <button type="button" onClick={onClose} className="btn-ghost px-3 py-1.5">Close</button>
      </div>
      {candidate && candidate.state !== 'SUBMITTED' && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => act('Message this candidate', 'Send', 'announcements', (message) => ({ message, candidateId: candidate.candidateId }))} className="btn-secondary px-3 py-2">
            Message this candidate
          </button>
          <button type="button" onClick={() => act('Submit this attempt now?', 'Submit attempt', `monitor/${attemptId}/submit`, (reason) => ({ reason }), true)} className="btn-danger px-3 py-2">
            Submit their attempt
          </button>
        </div>
      )}
      <SuccessToast message={done} />
      <ErrorToast message={error} />
      {timeline?.incidents.length === 0 && <p className="text-[color:var(--muted)]">Nothing was noted for this attempt.</p>}
      <ul className="space-y-3">
        {timeline?.incidents.map((incident) => (
          <li key={incident.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
            <p className="font-medium">
              {incident.label} · {incident.occurrences} {incident.occurrences === 1 ? 'time' : 'times'}
              <span className="chip ml-2">{incident.source === 'server' ? 'Seen by the server' : 'Reported by the browser'}</span>
            </p>
            <p className="mt-1">
              <LocalTime iso={incident.firstAt} />
              {incident.occurrences > 1 && <> to <LocalTime iso={incident.lastAt} /></>}
              {measures(incident) && ` · ${measures(incident)}`}
            </p>
            <p className="mt-1 text-[color:var(--muted)]">Possible innocent cause: {incident.innocent}</p>
            {incident.reviewedAt ? (
              <p className="mt-2">
                Reviewed by {incident.reviewedBy} on <LocalTime iso={incident.reviewedAt} />
                {incident.note && `: ${incident.note}`}
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  aria-label={`Review note for ${incident.label}`}
                  placeholder="Note (optional)"
                  maxLength={1000}
                  value={notes[incident.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [incident.id]: e.target.value })}
                  className="input-clean min-w-56 flex-1 px-3 py-1.5"
                />
                <button type="button" onClick={() => review(incident.id)} className="btn-secondary px-3 py-1.5">Mark reviewed</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
