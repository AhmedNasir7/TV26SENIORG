import { AppHeader } from '@/components/layout/AppHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ExamChat } from '@/components/chat/ExamChat'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { getCandidateExam } from '@/lib/services/access'

export default async function CandidateExamChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  const { exam } = await loadById((await params).id, (id) => getCandidateExam(user, id))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap py-10">
        <Breadcrumbs items={[{ label: 'Your examinations', href: '/candidate' }, { label: exam.title, href: `/candidate/exams/${exam.id}` }, { label: 'Chat' }]} />
        <div className="mt-8">
          <ExamChat examId={exam.id} title={exam.title} />
        </div>
      </main>
    </div>
  )
}
