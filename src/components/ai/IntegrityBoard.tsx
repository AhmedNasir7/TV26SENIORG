'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { ShieldAlert, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'
import type { IntegrityExplanation } from '@/lib/services/integrity-board'

type Signal = { kind: string; label: string; points: number }
type Row = { attemptId: number; candidate: string; score: number; level: 'low' | 'medium' | 'high'; corroboration: number; signals: Signal[]; reasons: string[] }
const TONE = { low: 'chip-success', medium: 'chip-warning', high: 'chip-danger' } as const
const WORDS = { low: 'No concern', medium: 'Worth a look', high: 'Strong: several signals' } as const

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
          <button type="button" onClick={() => void explain()} disabled={busy || !rows?.some((r) => r.level !== 'low')} className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> {busy ? 'Reading...' : 'Explain the top of the list'}
          </button>
        )}
      </div>
      <p className="max-w-3xl text-sm leading-6 text-[color:var(--muted)]">
        A score from logged events and answer similarity. It shows where to look first; it is not proof and changes no mark. <strong className="font-medium text-[color:var(--foreground)]">Strong</strong> needs two independent kinds of evidence; one kind alone is at most <strong className="font-medium text-[color:var(--foreground)]">worth a look</strong>.
      </p>
      <ErrorToast message={error} />
      {explanation && (
        <div className="rounded-xl bg-[var(--surface-muted)] p-4 text-sm leading-6">
          <p className="mb-1 flex items-center gap-2 font-medium"><Sparkles className="h-4 w-4" aria-hidden="true" /> AI overview{explanation.cached && <span className="font-normal text-[color:var(--muted)]">(saved)</span>}</p>
          <p>{explanation.overview}</p>
        </div>
      )}
      {rows && rows.length === 0 && <p className="text-sm text-[color:var(--muted)]">No submitted attempts yet.</p>}
      {rows && rows.length > 0 && (
        <ol className="space-y-3">
          {rows.map((row) => (
            <li key={row.attemptId} className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/examiner/exams/${examId}/attempts/${row.attemptId}`} className="link-accent text-[15px] font-semibold">{row.candidate}</Link>
                <div className="flex items-center gap-2.5">
                  <span className={`chip ${TONE[row.level]} whitespace-nowrap`}>{WORDS[row.level]}</span>
                  <span className="font-display text-xl font-semibold tabular-nums" aria-label={`Score ${row.score} of 100`}>{row.score}<span className="text-sm font-normal text-[color:var(--muted)]">/100</span></span>
                </div>
              </div>
              {row.signals.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">Nothing suspicious was logged.</p>
              ) : (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 marker:text-[color:var(--muted)]">
                  {row.signals.map((signal) => (
                    <li key={signal.label}>
                      <span className="first-letter:uppercase">{signal.label}</span>
                      <span className="ml-2 whitespace-nowrap rounded-md bg-[var(--surface-muted)] px-1.5 py-0.5 text-xs font-medium tabular-nums text-[color:var(--muted)]">
                        {signal.points > 0 ? `+${signal.points}` : 'not scored'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {notes.get(row.attemptId) && (
                <p className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3 text-sm leading-6">{notes.get(row.attemptId)}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
