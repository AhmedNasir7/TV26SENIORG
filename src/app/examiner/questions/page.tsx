import { DraftQuestions } from '@/components/ai/DraftQuestions'
import { QuestionBank } from '@/components/questions/QuestionBank'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { listTopics } from '@/lib/services/topics'

export default async function QuestionBankPage() {
  const actor = await requirePageUser(STAFF_ROLES)
  const topics = (await listTopics(actor)).map(({ id, name }) => ({ id, name }))

  return (
    <div className="p-8">
      <PageHeader eyebrow="Question bank" title="Questions" description="Reusable questions by topic and difficulty." />
      <DraftQuestions topics={topics} />
      <QuestionBank />
    </div>
  )
}
