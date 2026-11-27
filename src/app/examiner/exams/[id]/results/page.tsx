import Link from 'next/link'
import { PublishResults } from '@/components/results/PublishResults'
import { LocalTime } from '@/components/ui/LocalTime'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { examResults } from '@/lib/services/results'

const show = (value: number | null, unit = '') => (value === null ? '–' : `${value}${unit}`)

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const results = await loadById((await params).id, (id) => examResults(actor, id))
  const { exam, summary } = results
  const largest = Math.max(1, ...results.distribution.map((d) => d.count))
  const base = `/examiner/exams/${exam.id}`

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        eyebrow={exam.publishedAt ? 'Results published' : 'Results not published'}
        title={exam.title}
        description="Figures come from real submitted attempts. Averages include fully marked attempts only."
        actions={
          <>
            <Link href={`${base}/grading`} className="btn-primary px-4 py-2 text-sm">
              Mark written answers{summary.awaitingMarking > 0 && ` (${summary.awaitingMarking} attempts)`}
            </Link>
            <Link href={base} className="btn-secondary px-4 py-2 text-sm">Back to examination</Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Enrolled" value={summary.enrolled} delta={`${summary.attempted} attempted · ${summary.absent} without an attempt`} />
        <StatTile label="Average" value={show(summary.average)} delta={`of ${exam.totalMarks} · ${summary.count} marked`} />
        <StatTile label="Median" value={show(summary.median)} delta={`high ${show(summary.highest)} · low ${show(summary.lowest)}`} />
        <StatTile label="Pass rate" value={show(summary.passRate, '%')} delta={exam.passMarks === null ? 'No pass mark set' : `pass mark ${exam.passMarks}`} />
      </div>

      <section className="surface-card space-y-3 p-5 text-sm">
        <h2 className="font-display font-semibold">Publication</h2>
        {exam.publishedAt ? (
          <p>Published <LocalTime iso={exam.publishedAt} />. Marks are locked.</p>
        ) : (
          <ul aria-label="Publication checklist" className="space-y-1">
            {results.checks.map((check) => (
              <li key={check.label} style={{ color: check.ok ? 'var(--success)' : 'var(--danger)' }}>
                {check.ok ? 'Done' : 'Required'}: {check.label}
              </li>
            ))}
          </ul>
        )}
        <PublishResults examId={exam.id} published={exam.publishedAt !== null} ready={results.checks.every((c) => c.ok)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5 text-sm">
          <h2 className="font-display font-semibold">Score distribution</h2>
          <ul className="mt-3 space-y-2">
            {results.distribution.map((band) => (
              <li key={band.label} className="grid grid-cols-[5rem_1fr_2rem] items-center gap-3">
                <span>{band.label}</span>
                <span className="h-2 rounded-full bg-[var(--surface-muted)]">
                  <span className="block h-2 rounded-full bg-[var(--accent)]" style={{ width: `${(band.count / largest) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{band.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="surface-card p-5 text-sm">
          <h2 className="font-display font-semibold">By topic, weakest first</h2>
          <table className="mt-3 w-full">
            <thead className="text-left text-[color:var(--muted)]">
              <tr><th className="py-1 font-medium">Topic</th><th className="font-medium">Answers</th><th className="text-right font-medium">Marks earned</th></tr>
            </thead>
            <tbody>
              {results.topics.map((t) => (
                <tr key={t.topic} className="hairline-row">
                  <td className="py-1.5">{t.topic}</td><td className="tabular-nums">{t.answers}</td><td className="text-right tabular-nums">{t.percent}%</td>
                </tr>
              ))}
              {results.topics.length === 0 && <tr><td colSpan={3} className="py-2 text-[color:var(--muted)]">Nothing marked yet.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      <section className="surface-card overflow-x-auto p-5 text-sm">
        <h2 className="font-display font-semibold">Candidates</h2>
        <table className="mt-3 w-full min-w-[36rem]">
          <thead className="text-left text-[color:var(--muted)]">
            <tr><th className="py-1 font-medium">Candidate</th><th className="font-medium">State</th><th className="font-medium">Score</th><th className="font-medium">Outcome</th><th /></tr>
          </thead>
          <tbody>
            {results.attempts.map((a) => (
              <tr key={a.id} className="hairline-row">
                <td className="py-2">{a.name || a.email}<span className="block text-xs text-[color:var(--muted)]">{a.email}</span></td>
                <td>{a.state}{a.timedOut && ' · time ran out'}</td>
                <td className="tabular-nums">{a.score === null ? '–' : `${a.score} / ${a.maximum}`}</td>
                <td>{a.passed === null ? '–' : a.passed ? 'Passed' : 'Not passed'}</td>
                <td className="text-right">
                  {a.state !== 'Running' && <Link href={`${base}/attempts/${a.id}`} className="link-accent">View paper</Link>}
                </td>
              </tr>
            ))}
            {results.attempts.length === 0 && <tr><td colSpan={5} className="py-2 text-[color:var(--muted)]">No attempts yet.</td></tr>}
          </tbody>
        </table>
      </section>

      {results.history.length > 0 && (
        <section className="surface-card p-5 text-sm">
          <h2 className="font-display font-semibold">Marking and publication history</h2>
          <ul className="mt-3 space-y-1">
            {results.history.map((entry) => (
              <li key={entry.id}><LocalTime iso={entry.at} /> · {entry.by} · {entry.what}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
