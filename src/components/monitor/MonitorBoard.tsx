'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { LocalTime } from '@/components/ui/LocalTime'
import { StatTile } from '@/components/ui/StatTile'
import { apiRequest } from '@/lib/client/request'
import type { Board } from '@/lib/services/monitor'
import { AttemptTimeline } from './AttemptTimeline'

const REFRESH_MS = 5000

const STATE = {
  NOT_STARTED: { label: 'Not started', chip: '' },
  ACTIVE: { label: 'Active', chip: 'chip-success' },
  DISCONNECTED: { label: 'Disconnected', chip: 'chip-warning' },
  SUBMITTED: { label: 'Submitted', chip: '' },
} as const

const timeLeft = (seconds: number | null) =>
  seconds === null ? '–' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Refreshed by polling while the page is visible, so it needs no outside real-time service. */
export function MonitorBoard({ examId, initial }: { examId: number; initial: Board }) {
  const [board, setBoard] = useState(initial)
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page) })
    if (search.trim()) query.set('search', search.trim())
    if (state) query.set('state', state)
    try {
      setBoard(await apiRequest<Board>(`/api/exams/${examId}/monitor?${query}`))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh')
    }
  }, [examId, page, search, state])

  useEffect(() => {
    const first = setTimeout(load, 250) // waits for typing to pause
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  const { totals } = board

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Not started" value={totals.notStarted} delta={`${totals.enrolled} enrolled`} tone="muted" />
        <StatTile label="Active" value={totals.active} tone="success" />
        <StatTile label="Disconnected" value={totals.disconnected} />
        <StatTile label="Submitted" value={totals.submitted} tone="muted" />
        <StatTile label="To look at" value={totals.flagged} delta="reached your indicator limit" />
      </div>

      <section className="surface-card p-5 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="mb-1 block font-medium">Search</span>
            <input value={search} maxLength={100} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Name or email" className="input-clean px-3 py-2" />
          </label>
          <label>
            <span className="mb-1 block font-medium">Show</span>
            <select value={state} onChange={(e) => { setState(e.target.value); setPage(1) }} className="input-clean px-3 py-2">
              <option value="">Everyone</option>
              {Object.entries(STATE).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
              <option value="FLAGGED">To look at</option>
            </select>
          </label>
          <p className="ml-auto text-[color:var(--muted)]">Updated <LocalTime iso={board.serverNow} /></p>
        </div>
        <p className="mt-3 text-[color:var(--muted)]">
          Indicators are reasons to look, not evidence of misconduct. They never change a score.
        </p>
        <ErrorToast message={error} />

        <div className="mt-3 overflow-x-auto">
          <table className="data-table w-full min-w-[40rem]">
            <thead>
              <tr><th>Candidate</th><th>State</th><th>Answered</th><th>Time left</th><th>Last contact</th><th>Indicators</th></tr>
            </thead>
            <tbody>
              {board.rows.map((row) => (
                <tr key={row.candidateId}>
                  <td>{row.name || row.email}<span className="block text-xs text-[color:var(--muted)]">{row.email}</span></td>
                  <td><span className={`chip ${STATE[row.state].chip}`}>{STATE[row.state].label}</span></td>
                  <td className="tabular-nums">{row.attemptId ? `${row.answered} / ${row.total}` : '–'}</td>
                  <td className="tabular-nums">{timeLeft(row.secondsLeft)}</td>
                  <td>{row.lastSeenAt ? <LocalTime iso={row.lastSeenAt} /> : '–'}</td>
                  <td>
                    {row.attemptId ? (
                      <button type="button" onClick={() => setSelected(row.attemptId)} className={row.flagged ? 'chip chip-warning' : 'btn-ghost px-2 py-1'}>
                        {row.indicators} unreviewed{row.flagged && ' · look'}
                      </button>
                    ) : '–'}
                  </td>
                </tr>
              ))}
              {board.rows.length === 0 && <tr><td colSpan={6} className="text-[color:var(--muted)]">No candidates match.</td></tr>}
            </tbody>
          </table>
        </div>

        {board.totalPages > 1 && (
          <nav aria-label="Pages" className="mt-3 flex items-center gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
            <span>Page {board.page} of {board.totalPages}</span>
            <button type="button" disabled={page >= board.totalPages} onClick={() => setPage(page + 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
          </nav>
        )}
      </section>

      {selected !== null && (
        <AttemptTimeline
          key={selected}
          examId={examId}
          attemptId={selected}
          candidate={board.rows.find((row) => row.attemptId === selected)}
          onClose={() => setSelected(null)}
          onReviewed={load}
        />
      )}
    </div>
  )
}
