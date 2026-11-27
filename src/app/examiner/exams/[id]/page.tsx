import { ExamActions } from '@/components/exams/ExamActions'
import { ExamForm } from '@/components/exams/ExamForm'
import { LocalTime } from '@/components/ui/LocalTime'
import { PageHeader } from '@/components/ui/PageHeader'
import { Checklist } from '@/components/ui/Checklist'
import { StatusPill } from '@/components/ui/StatusPill'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { getExam } from '@/lib/services/exams'

export default async function ExamReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const exam = await loadById((await params).id, (id) => getExam(actor, id))
  const isDraft = exam.phase === 'DRAFT'

  return (
    <div className="p-8">
      <PageHeader status={<StatusPill phase={exam.phase} />} title={exam.title} />

      <div className="grid items-start gap-8 xl:grid-cols-2">
      <section id="publish" className="surface-card scroll-mt-24 space-y-8 p-8 text-sm">
        <dl className="facts">
          <div><dt>Opens</dt><dd><LocalTime iso={exam.startsAt} /></dd></div>
          <div><dt>Closes</dt><dd><LocalTime iso={exam.endsAt} /></dd></div>
          <div><dt>Duration</dt><dd>{exam.durationMinutes} minutes</dd></div>
          <div><dt>Marks</dt><dd>{exam.totalMarks}{exam.passMarks !== null && ` · pass ${exam.passMarks}`}</dd></div>
        </dl>
        <p className="text-[color:var(--muted)]">
          {exam.shuffleQuestions ? 'Questions shuffled' : 'Fixed question order'} ·{' '}
          {exam.shuffleOptions ? 'options shuffled' : 'fixed option order'} ·{' '}
          {exam.allowBackNavigation ? 'candidates can go back' : 'no going back'}
        </p>
        {isDraft && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="mb-2.5 font-medium">Ready to publish?</p>
            <Checklist
              label="Publication checklist"
              items={exam.checks.map((check) => ({ label: check.label, state: check.ok ? 'done' : check.blocking ? 'required' : 'warning' }))}
            />
          </div>
        )}
        <ExamActions id={exam.id} isDraft={isDraft} canPublish={exam.checks.every((c) => c.ok || !c.blocking)} canUnpublish={exam.canUnpublish} />
      </section>

      {exam.canEdit === 'none' ? (
        <section className="surface-card p-5 text-sm">
          <h2 className="font-display mb-2 font-semibold">Instructions</h2>
          <p className="whitespace-pre-wrap">{exam.instructions || 'None'}</p>
          <p className="mt-3 text-[color:var(--muted)]">The examination has started, so its settings are locked.</p>
        </section>
      ) : (
        <div>
          {exam.canEdit === 'wording' && (
            <p className="mb-3 text-sm text-[color:var(--muted)]">Published: only the title and instructions can change. Unpublish to change anything else.</p>
          )}
          <ExamForm key={`${exam.phase}-${exam.totalMarks}`} exam={exam} wordingOnly={exam.canEdit === 'wording'} />
        </div>
      )}
      </div>
    </div>
  )
}
