import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { requirePageUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { STAFF_ROLES } from '@/lib/roles'

export default async function ExaminerHomePage() {
  const user = await requirePageUser(STAFF_ROLES)
  // Examiners count only what they own; administrators see the whole platform
  const owned = user.role === 'ADMIN' ? {} : { ownerId: user.id }

  const [exams, drafts, questions] = await Promise.all([
    prisma.exam.count({ where: owned }),
    prisma.exam.count({ where: { ...owned, status: 'DRAFT' } }),
    prisma.question.count({ where: { ...owned, archivedAt: null } }),
  ])

  return (
    <div className="p-8">
      <PageHeader eyebrow="Examinations" title="Your workspace" description="Examinations and questions you manage." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Examinations" value={exams} />
        <StatTile label="Drafts" value={drafts} />
        <StatTile label="Questions in your bank" value={questions} />
      </div>
    </div>
  )
}
