import Link from 'next/link'
import { GradeForm } from '@/components/results/GradeForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { gradingQueue } from '@/lib/services/grading'
import { gradingQuerySchema } from '@/lib/validation/grading'
import { PenLine } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }

export default async function GradingPage({ params, searchParams }: Props) {
  const actor = await requirePageUser(STAFF_ROLES)
  // Empty form fields are dropped; anything invalid falls back to the default queue
  const raw = Object.fromEntries(Object.entries(await searchParams).filter(([, value]) => value))
  const parsed = gradingQuerySchema.safeParse(raw)
  const query = parsed.success ? parsed.data : gradingQuerySchema.parse({})
  const queue = await loadById((await params).id, (id) => gradingQueue(actor, id, query))
  const base = `/examiner/exams/${queue.exam.id}`

  const pageLink = (page: number) => {
    const next = new URLSearchParams({ show: query.show, page: String(page) })
    if (query.questionVersionId) next.set('questionVersionId', String(query.questionVersionId))
    if (query.attemptId) next.set('attemptId', String(query.attemptId))
    return `${base}/grading?${next}`
  }

  return (
    <div className="space-y-5 p-8">
      <PageHeader
        eyebrow="Written answers"
        title={queue.exam.title}
        description={`${queue.pendingTotal} waiting for a mark. Candidates are listed together by question.`}
        actions={<Link href={`${base}/results`} className="btn-secondary px-4 py-2 text-sm">Results</Link>}
      />
      {queue.exam.locked && <p role="status" className="surface-card p-4 text-sm">Results are published, so marks are locked. Withdraw them to make a correction.</p>}

      <form method="get" className="surface-card flex flex-wrap items-end gap-3 p-4 text-sm">
        <label>
          <span className="mb-1 block font-medium">Show</span>
          <select name="show" defaultValue={query.show} className="input-clean px-3 py-2">
            <option value="pending">Waiting for a mark</option>
            <option value="all">All written answers</option>
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block font-medium">Question</span>
          <select name="questionVersionId" defaultValue={query.questionVersionId ?? ''} className="input-clean max-w-xs px-3 py-2">
            <option value="">All questions</option>
            {queue.questions.map((q) => (
              <option key={q.questionVersionId} value={q.questionVersionId}>{q.text.slice(0, 80)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-secondary px-4 py-2">Filter</button>
        {query.attemptId && <Link href={`${base}/grading`} className="link-accent py-2">Showing one candidate: show everyone</Link>}
      </form>

      {queue.answers.length === 0 ? (
        <div className="surface-card"><EmptyState icon={PenLine} title="Nothing to show here" description="Answers that match this filter will appear here." /></div>
      ) : (
        <ul className="space-y-4">
          {queue.answers.map((answer) => (
            <li key={`${answer.id}-${answer.version}`} className="surface-card p-5 text-sm">
              <p className="text-xs text-[color:var(--muted)]">
                {answer.candidate} · <Link href={`${base}/attempts/${answer.attemptId}`} className="link-accent">view paper</Link>
                {answer.gradedBy && ` · marked by ${answer.gradedBy}`}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words font-medium">{answer.question}</p>
              {answer.guidance && <p className="mt-1 text-[color:var(--muted)]">Marking notes: {answer.guidance}</p>}
              <p className="mt-3 whitespace-pre-wrap break-words rounded-[var(--radius-sm)] border border-[var(--border)] p-3">{answer.response.trim() || 'No answer'}</p>
              <GradeForm examId={queue.exam.id} answer={answer} locked={queue.exam.locked} />
            </li>
          ))}
        </ul>
      )}

      {queue.totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-3 text-sm">
          {queue.page > 1 && <Link href={pageLink(queue.page - 1)} className="btn-secondary px-3 py-1.5">Previous</Link>}
          <span>Page {queue.page} of {queue.totalPages}</span>
          {queue.page < queue.totalPages && <Link href={pageLink(queue.page + 1)} className="btn-secondary px-3 py-1.5">Next</Link>}
        </nav>
      )}
    </div>
  )
}
