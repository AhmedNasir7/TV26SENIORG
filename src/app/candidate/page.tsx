import { CandidateExamList } from '@/components/exams/CandidateExamList'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatTile } from '@/components/ui/StatTile'
import { requirePageUser } from '@/lib/auth'
import { listCandidateExams } from '@/lib/services/access'

export default async function CandidateHomePage() {
  const user = await requirePageUser(['CANDIDATE'])
  const { exams, serverNow } = await listCandidateExams(user)
  const inState = (...states: string[]) => exams.filter((e) => states.includes(e.access.state))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap py-8">
        <PageHeader eyebrow="Candidate" title="Your examinations" description="Open papers, what is coming up and your results." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Open now" value={inState('available', 'in_progress').length} variant={inState('available', 'in_progress').length > 0 ? 'highlight' : 'plain'} tone="success" />
          <StatTile label="Upcoming" value={inState('upcoming').length} />
          <StatTile label="Completed" value={inState('submitted', 'closed').length} tone="muted" />
        </div>
        <CandidateExamList title="Available now" exams={inState('available', 'in_progress')} serverNow={serverNow} empty="Nothing is open right now." />
        <CandidateExamList title="Upcoming" exams={inState('upcoming')} serverNow={serverNow} empty="Nothing scheduled." />
        <CandidateExamList title="Completed" exams={inState('submitted', 'closed').reverse()} serverNow={serverNow} empty="No finished examinations yet." />
      </main>
    </div>
  )
}
