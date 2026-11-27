import { Check } from 'lucide-react'
import { LocalTime } from '@/components/ui/LocalTime'
import type { Report } from '@/lib/services/report'

/** One marked paper. Correct answers and notes appear only when the server included them (staff). */
export function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-4">
      <section className="surface-card p-5 text-sm">
        <p className="text-[color:var(--muted)]">{report.candidate}</p>
        <p className="stat-figure mt-1 text-3xl font-semibold">
          {report.score === null ? 'Not fully marked' : `${report.score} / ${report.maximum}`}
        </p>
        {report.passed !== null && (
          <p className="mt-2 flex items-center gap-2 font-medium">
            <span className={`chip ${report.passed ? 'chip-success' : 'chip-danger'}`}>{report.passed ? 'Passed' : 'Not passed'}</span>
            <span className="text-[color:var(--muted)]">pass mark {report.passMarks}</span>
          </p>
        )}
        <p className="mt-2 text-[color:var(--muted)]">
          {report.timedOut ? 'Submitted automatically when time ran out' : 'Submitted'}
          {report.submittedAt && <> · <LocalTime iso={report.submittedAt} /></>}
        </p>
        {report.receipt && <p className="mt-1 break-all font-mono text-xs text-[color:var(--muted)]">Receipt: {report.receipt}</p>}
      </section>

      <ol className="space-y-3">
        {report.questions.map((q) => (
          <li key={q.id} className="surface-card p-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-[color:var(--muted)]">Question {q.position}</p>
              <span className={`chip ${q.marks === null ? '' : q.marks === q.maximum ? 'chip-success' : q.marks === 0 ? 'chip-danger' : 'chip-warning'}`}>
                {q.marks ?? 'unmarked'} of {q.maximum} marks
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words font-medium">{q.text}</p>
            {q.type === 'WRITTEN' ? (
              <p className="mt-3 whitespace-pre-wrap break-words rounded-[var(--radius-sm)] border border-[var(--border)] p-3">
                {q.written?.trim() || 'No answer'}
              </p>
            ) : (
              <ul className="mt-3">
                {q.options.map((option, index) => (
                  <li key={index} className="option-row break-words" data-chosen={option.chosen} data-correct={option.correct === undefined ? undefined : option.correct}>
                    <span className="option-mark" aria-hidden="true" />
                    <span className="flex-1">
                      {option.text}
                      {option.chosen && <span className="text-[color:var(--muted)]"> (selected)</span>}
                    </span>
                    {option.correct && <span className="chip chip-success inline-flex shrink-0 items-center gap-1"><Check className="h-3.5 w-3.5" aria-hidden="true" />correct</span>}
                  </li>
                ))}
                {!q.options.some((o) => o.chosen) && <li className="mt-2 text-[color:var(--muted)]">No answer</li>}
              </ul>
            )}
            {q.feedback && <p className="mt-3"><span className="font-medium">Feedback:</span> {q.feedback}</p>}
            {q.guidance && <p className="mt-2 text-[color:var(--muted)]">Marking notes: {q.guidance}</p>}
          </li>
        ))}
      </ol>
    </div>
  )
}
