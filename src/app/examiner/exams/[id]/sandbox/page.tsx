import { BackLink } from '@/components/ui/BackLink'
import { AttemptScreen } from '@/components/attempt/AttemptScreen'
import { SandboxControls } from '@/components/exams/SandboxControls'
import { ReportView } from '@/components/results/ReportView'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { sandboxReport } from '@/lib/services/report'
import { sandboxStatus } from '@/lib/services/sandbox'

export default async function SandboxPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const { exam, state } = await loadById((await params).id, (id) => sandboxStatus(actor, id))
  if (state === 'running') return <AttemptScreen examId={exam.id} sandbox />
  const report = state === 'submitted' ? await sandboxReport(actor, exam.id) : null

  return (
    <div className="space-y-5 p-8">
      <PageHeader
        eyebrow="Sandbox"
        title={exam.title}
        description="Take the examination as a candidate would. Trial runs never reach results, monitoring or statistics."
        actions={<BackLink href={`/examiner/exams/${exam.id}`}>Back to examination</BackLink>}
      />
      {exam.questions === 0 ? (
        <p className="surface-card p-5 text-sm">Add questions to the examination before trying it.</p>
      ) : (
        <SandboxControls examId={exam.id} durationMinutes={exam.durationMinutes} hasAttempt={state !== 'none'} />
      )}
      {report && <ReportView report={report} />}
    </div>
  )
}
