import Link from 'next/link'
import { LocalTime } from '@/components/ui/LocalTime'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { requirePageUser } from '@/lib/auth'
import { PHASE_LABEL } from '@/lib/exam-labels'
import { prisma } from '@/lib/prisma'
import { STAFF_ROLES } from '@/lib/roles'
import { listExams, PHASES } from '@/lib/services/exams'

type Props = { searchParams: Promise<{ phase?: string }> }

export default async function ExaminerHomePage({ searchParams }: Props) {
  const user = await requirePageUser(STAFF_ROLES)
  const requested = (await searchParams).phase
  const phase = PHASES.find((p) => p === requested)

  const [all, questions] = await Promise.all([
    listExams(user),
    prisma.question.count({ where: { ...(user.role !== 'ADMIN' && { ownerId: user.id }), archivedAt: null } }),
  ])
  const exams = phase ? await listExams(user, phase) : all

  return (
    <div className="p-8">
      <PageHeader eyebrow="Examinations" title="Your workspace" description="Examinations and questions you manage." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Examinations" value={all.length} />
        <StatTile label="Open now" value={all.filter((e) => e.phase === 'ONGOING').length} tone="success" />
        <StatTile label="Questions in your bank" value={questions} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by state" className="flex flex-wrap gap-1">
          {[undefined, ...PHASES].map((p) => (
            <Link key={p ?? 'all'} href={p ? `/examiner?phase=${p}` : '/examiner'} aria-current={p === phase ? 'page' : undefined} className={`px-3 py-1.5 text-sm ${p === phase ? 'btn-secondary' : 'btn-ghost'}`}>
              {p ? PHASE_LABEL[p] : 'All'}
            </Link>
          ))}
        </nav>
        <Link href="/examiner/exams/new" className="btn-primary px-4 py-2 text-sm">
          New examination
        </Link>
      </div>

      <ul className="surface-card mt-4">
        {exams.length === 0 && <li className="p-6 text-sm text-[color:var(--muted)]">No examinations here.</li>}
        {exams.map((exam) => (
          <li key={exam.id} className="hairline-row flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/examiner/exams/${exam.id}`} className="link-accent">{exam.title}</Link>
              <p className="text-sm text-[color:var(--muted)]">
                {PHASE_LABEL[exam.phase]} · <LocalTime iso={exam.startsAt} /> · {exam.durationMinutes} min ·{' '}
                {exam.questions} questions · {exam.enrolled} candidates
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/examiner/exams/${exam.id}/questions`} className="btn-secondary px-3 py-1.5 text-sm">Questions</Link>
              <Link href={`/examiner/exams/${exam.id}/candidates`} className="btn-secondary px-3 py-1.5 text-sm">Candidates</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
