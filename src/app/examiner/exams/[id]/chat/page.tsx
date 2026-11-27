import { ExamChat } from '@/components/chat/ExamChat'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { examFlow } from '@/lib/services/exam-flow'

export default async function ExaminerExamChatPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const exam = await loadById((await params).id, (id) => examFlow(actor, id))
  return (
    <div className="p-8">
      <ExamChat examId={exam.id} title={exam.title} />
    </div>
  )
}
