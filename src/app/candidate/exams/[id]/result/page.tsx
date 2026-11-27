import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AppHeader } from '@/components/layout/AppHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CandidateSteps } from '@/components/exams/CandidateSteps'
import { ReportView } from '@/components/results/ReportView'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { candidateResult } from '@/lib/services/report'

export default async function CandidateResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  const report = await loadById((await params).id, (id) => candidateResult(user, id))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap max-w-3xl py-8">
        <Link href="/candidate" className="btn-ghost -ml-2 gap-1.5 px-2 py-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to your examinations
        </Link>
        <div className="mt-3 space-y-3">
          <Breadcrumbs items={[{ label: 'Your examinations', href: '/candidate' }, { label: report.exam.title, href: `/candidate/exams/${report.exam.id}` }, { label: 'Result' }]} />
          <CandidateSteps current={3} />
        </div>
        <h1 className="font-display mb-5 mt-3 text-3xl font-semibold tracking-tight">{report.exam.title}</h1>
        <ReportView report={report} />
      </main>
    </div>
  )
}
