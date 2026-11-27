import { CandidateExamList } from '@/components/exams/CandidateExamList'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { listCandidateExams } from '@/lib/services/access'

export default async function CandidateHomePage() {
  const user = await requirePageUser(['CANDIDATE'])
  const { exams, serverNow } = await listCandidateExams(user)
  const inState = (...states: string[]) => exams.filter((e) => states.includes(e.access.state))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap py-12">
        <PageHeader eyebrow="Candidate" title="Your examinations" />
        <CandidateExamList title="Available now" exams={inState('available', 'in_progress')} serverNow={serverNow} empty="Nothing is open right now." />
        <CandidateExamList title="Upcoming" exams={inState('upcoming')} serverNow={serverNow} empty="Nothing scheduled." />
        <CandidateExamList title="Completed" exams={inState('submitted', 'closed').reverse()} serverNow={serverNow} empty="No finished examinations yet." />
      </main>
    </div>
  )
}
