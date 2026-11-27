import { AppHeader } from '@/components/layout/AppHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CandidateSteps } from '@/components/exams/CandidateSteps'
import { CandidateDisputes } from '@/components/results/CandidateDisputes'
import { ReportView } from '@/components/results/ReportView'
import { ownDisputes } from '@/lib/services/disputes'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { candidateResult } from '@/lib/services/report'

export default async function CandidateResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  const report = await loadById((await params).id, (id) => candidateResult(user, id))
  const disputes = await ownDisputes(user.id, report.exam.id)

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap py-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs items={[{ label: 'Your examinations', href: '/candidate' }, { label: report.exam.title, href: `/candidate/exams/${report.exam.id}` }, { label: 'Result' }]} />
          <CandidateSteps current={3} />
        </div>
        <h1 className="font-display mb-6 mt-10 text-4xl font-semibold tracking-tight">{report.exam.title}</h1>
        <a href={`/api/me/exams/${report.exam.id}/result/pdf`} className="btn-primary mb-4 inline-flex px-4 py-2.5 text-sm">Download verifiable PDF</a>
        <ReportView report={report} />
        <CandidateDisputes examId={report.exam.id} questions={report.questions.map(({ id, position }) => ({ id, position }))} disputes={disputes} />
      </main>
    </div>
  )
}
