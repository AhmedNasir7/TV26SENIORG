import Link from 'next/link'
import { ReportView } from '@/components/results/ReportView'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { staffReport } from '@/lib/services/report'

export default async function AttemptPaperPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const { id, attemptId } = await params
  const report = await loadById(id, (examId) => loadById(attemptId, (aid) => staffReport(actor, examId, aid)))
  const base = `/examiner/exams/${report.exam.id}`

  return (
    <div className="max-w-3xl p-8">
      <PageHeader
        eyebrow="Submitted paper"
        title={report.exam.title}
        actions={
          <>
            <Link href={`${base}/grading?show=all&attemptId=${report.attemptId}`} className="btn-primary px-4 py-2 text-sm">Mark this paper</Link>
            <Link href={`${base}/results`} className="btn-secondary px-4 py-2 text-sm">Results</Link>
          </>
        }
      />
      <ReportView report={report} />
    </div>
  )
}
