'use client'

import { ShieldAlert, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'
import type { IntegrityExplanation } from '@/lib/services/integrity-board'

type Row = { attemptId: number; candidate: string; score: number; level: 'low' | 'medium' | 'high'; reasons: string[] }
const TONE = { low: 'chip-success', medium: 'chip-warning', high: 'chip-danger' } as const

/** Candidates ranked by a repeatable score; the AI explanation is a separate button press. */
export function IntegrityBoard({ examId }: { examId: number }) {
  const features = useFeatures()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [explanation, setExplanation] = useState<IntegrityExplanation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<{ rows: Row[] }>(`/api/exams/${examId}/integrity`)
      .then((data) => setRows(data.rows))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the scores'))
  }, [examId])

  async function explain() {
    setBusy(true)
    setError('')
    try {
      setExplanation((await apiRequest<{ explanation: IntegrityExplanation }>(`/api/exams/${examId}/integrity`, 'POST')).explanation)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get an explanation')
    } finally {
      setBusy(false)
    }
  }

  const notes = new Map(explanation?.items.map((item) => [item.attemptId, item.note]))

  return (
    <section className="surface-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Integrity ranking
        </h2>
        {features.ai && (
          <button type="button" onClick={() => void explain()} disabled={busy || !rows?.some((r) => r.score > 0)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {busy ? 'Reading...' : 'Explain the top of the list'}
          </button>
        )}
      </div>
      <p className="text-sm text-[color:var(--muted)]">A score from logged events and answer similarity. It shows where to look first; it is not proof and changes no mark.</p>
      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      {explanation && <p className="text-sm">{explanation.overview}{explanation.cached && <span className="text-[color:var(--muted)]"> (saved)</span>}</p>}
      {rows && rows.length === 0 && <p className="text-sm text-[color:var(--muted)]">No submitted attempts yet.</p>}
      {rows && rows.length > 0 && (
        <ol className="divide-y divide-[var(--border)] text-sm">
          {rows.map((row) => (
            <li key={row.attemptId} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link href={`/examiner/exams/${examId}/attempts/${row.attemptId}`} className="link-accent font-medium">{row.candidate}</Link>
                <p className="text-[color:var(--muted)]">{row.reasons.join(', ') || 'Nothing logged'}</p>
                {notes.get(row.attemptId) && <p className="mt-1">{notes.get(row.attemptId)}</p>}
              </div>
              <span className={`chip ${TONE[row.level]} tabular-nums`}>{row.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
