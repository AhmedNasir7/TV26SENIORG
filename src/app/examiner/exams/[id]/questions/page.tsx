import { notFound } from 'next/navigation'
import { ExamQuestionPicker } from '@/components/questions/ExamQuestionPicker'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { ApiError } from '@/lib/server/api'
import { getExamQuestions } from '@/lib/services/exam-questions'

export default async function ExamQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const data = await getExamQuestions(actor, id).catch((error) => {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound()
    throw error
  })

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Examination questions"
        title={data.exam.title}
        description={data.exam.editable ? 'Choose questions, order them and set marks.' : 'Published: questions are locked.'}
      />
      <ExamQuestionPicker initial={data} />
    </div>
  )
}
