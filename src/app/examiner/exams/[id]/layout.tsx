import { ExamNav } from '@/components/exams/ExamNav'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { examFlow } from '@/lib/services/exam-flow'

type Props = { children: React.ReactNode; params: Promise<{ id: string }> }

/** Every page of one examination shares the same breadcrumbs, step bar and next action. */
export default async function ExamLayout({ children, params }: Props) {
  const actor = await requirePageUser(STAFF_ROLES)
  const exam = await loadById((await params).id, (id) => examFlow(actor, id))

  return (
    <>
      <ExamNav exam={exam} />
      {children}
    </>
  )
}
