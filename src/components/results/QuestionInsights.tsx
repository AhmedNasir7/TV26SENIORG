import { Check } from 'lucide-react'
import type { questionInsights } from '@/lib/services/analytics'

type Items = Awaited<ReturnType<typeof questionInsights>>
const title = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

/** Hardest first. Details stay folded until asked for, so the page stays readable. */
export function QuestionInsights({ items }: { items: Items }) {
  return (
    <section className="surface-card p-6 text-sm">
      <h2 className="font-display text-lg font-semibold">Question insight</h2>
      <p className="mt-1 text-[color:var(--muted)]">Hardest first. Open a question to see what candidates chose.</p>
      {items.length === 0 && <p className="mt-4 text-[color:var(--muted)]">Available once attempts are marked.</p>}
      <ul className="mt-4 space-y-3">
        {items.map((q) => (
          <li key={q.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-medium">{q.text}</span>
                <span className="chip">{q.correctRate}% full marks</span>
                {q.skipRate > 0 && <span className="chip">{q.skipRate}% skipped</span>}
                {q.review && <span className="chip chip-warning">Check wording or key</span>}
              </summary>
              <p className="mt-3 text-[color:var(--muted)]">
                Set as {title(q.declared)}, behaving as {q.observed ? title(q.observed) : 'unknown'} · average {q.averageMarks} marks ·{' '}
                {q.sittings} sittings
                {q.discrimination !== null && ` · discrimination ${q.discrimination}`}
              </p>
              {q.options.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {q.options.map((o, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="break-words">{o.text}{o.correct && <Check className="ml-1.5 inline h-4 w-4" aria-label="correct" />}</span>
                      <span className="shrink-0 tabular-nums">chosen {o.chosen}</span>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </li>
        ))}
      </ul>
    </section>
  )
}
