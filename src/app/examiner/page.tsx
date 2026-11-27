import Link from 'next/link'
import { ArrowRight, ClipboardList, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'
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
      <PageHeader eyebrow="Examinations" title="Your workspace" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Examinations" value={all.length} />
        <StatTile label="Open now" value={all.filter((e) => e.phase === 'ONGOING').length} tone="success" variant="highlight" />
        <StatTile label="Questions in your bank" value={questions} variant="glow" />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter by state" className="segmented">
          {[undefined, ...PHASES].map((p) => (
            <Link key={p ?? 'all'} href={p ? `/examiner?phase=${p}` : '/examiner'} aria-current={p === phase ? 'page' : undefined} className="segmented-item">
              {p ? PHASE_LABEL[p] : 'All'}
              <span className="segmented-count">{p ? all.filter((e) => e.phase === p).length : all.length}</span>
            </Link>
          ))}
        </nav>
        <Link href="/examiner/exams/new" className="btn-primary px-4 py-2 text-sm">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New examination
        </Link>
      </div>

      <ul className="surface-card mt-6">
        {exams.length === 0 && (
          <li>
            <EmptyState icon={ClipboardList} title="No examinations here" description="Examinations in this state will appear here. Create one to get started." />
          </li>
        )}
        {exams.map((exam) => (
          <li key={exam.id} className="hairline-row flex flex-wrap items-center justify-between gap-4 px-8 py-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="w-[7.25rem] shrink-0"><StatusPill phase={exam.phase} /></span>
              <div className="min-w-0">
                <Link href={`/examiner/exams/${exam.id}`} className="font-medium hover:underline hover:underline-offset-4">{exam.title}</Link>
                <p className="mt-0.5 text-sm text-[color:var(--muted)]">
                  <LocalTime iso={exam.startsAt} /> · {exam.durationMinutes} min · {exam.questions} questions · {exam.enrolled} candidates
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/examiner/exams/${exam.id}`} className="btn-primary px-3 py-1.5 text-sm">Manage<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
