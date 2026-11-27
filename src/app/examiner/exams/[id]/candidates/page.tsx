import { BackLink } from '@/components/ui/BackLink'
import { EnrollmentManager } from '@/components/exams/EnrollmentManager'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { getExam } from '@/lib/services/exams'

export default async function ExamCandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const exam = await loadById((await params).id, (id) => getExam(actor, id))

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Candidates"
        title={exam.title}
        description="Enrol candidates and grant extra time."
        actions={<BackLink href={`/examiner/exams/${exam.id}`}>Back to examination</BackLink>}
      />
      <EnrollmentManager examId={exam.id} open={exam.phase !== 'COMPLETED'} />
    </div>
  )
}
