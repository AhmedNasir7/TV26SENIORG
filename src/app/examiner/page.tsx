import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { requirePageUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STAFF_ROLES } from '@/lib/roles'

export default async function ExaminerHomePage() {
  const user = await requirePageUser(STAFF_ROLES)
  // Examiners count only what they own; administrators see the whole platform
  const owned = user.role === 'ADMIN' ? {} : { ownerId: user.id }

  const [exams, drafts, questions, list] = await Promise.all([
    prisma.exam.count({ where: owned }),
    prisma.exam.count({ where: { ...owned, status: 'DRAFT' } }),
    prisma.question.count({ where: { ...owned, archivedAt: null } }),
    prisma.exam.findMany({
      where: owned,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, status: true, totalMarks: true, _count: { select: { questions: true } } },
    }),
  ])

  return (
    <div className="p-8">
      <PageHeader eyebrow="Examinations" title="Your workspace" description="Examinations and questions you manage." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Examinations" value={exams} />
        <StatTile label="Drafts" value={drafts} />
        <StatTile label="Questions in your bank" value={questions} />
      </div>

      <ul className="surface-card mt-6">
        {list.length === 0 && <li className="p-6 text-sm text-[color:var(--muted)]">No examinations yet.</li>}
        {list.map((exam) => (
          <li key={exam.id} className="hairline-row flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-medium">{exam.title}</p>
              <p className="text-sm text-[color:var(--muted)]">
                {exam.status === 'DRAFT' ? 'Draft' : 'Published'} · {exam._count.questions} questions ·{' '}
                {Number(exam.totalMarks)} marks
              </p>
            </div>
            <Link href={`/examiner/exams/${exam.id}/questions`} className="btn-secondary px-3 py-1.5 text-sm">
              Questions
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
