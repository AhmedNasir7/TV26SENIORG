'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import type { Timeline } from '@/lib/services/monitor'

type Props = { examId: number; attemptId: number; onClose: () => void; onReviewed: () => void }
type Incident = Timeline['incidents'][number]

function measures({ details }: Incident) {
  const parts: string[] = []
  if (details.totalSeconds !== undefined) parts.push(`${details.totalSeconds} s in total, longest ${details.longestSeconds ?? 0} s`)
  if (details.totalCharacters !== undefined) parts.push(`${details.totalCharacters} characters`)
  return parts.join(' · ')
}

export function AttemptTimeline({ examId, attemptId, onClose, onReviewed }: Props) {
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
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
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
