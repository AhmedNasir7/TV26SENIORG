import Link from 'next/link'
import { AppHeader } from '@/components/layout/AppHeader'
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
        <Link href="/candidate" className="link-accent text-sm">Back to your examinations</Link>
        <h1 className="font-display mb-5 mt-3 text-3xl font-semibold tracking-tight">{report.exam.title}</h1>
        <ReportView report={report} />
      </main>
    </div>
  )
}
