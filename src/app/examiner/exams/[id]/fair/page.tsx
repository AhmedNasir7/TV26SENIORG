import { FairPaper } from '@/components/exams/FairPaper'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { loadById } from '@/lib/server/page'
import { fairSetup } from '@/lib/services/fair'

export default async function FairPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePageUser(STAFF_ROLES)
  const setup = await loadById((await params).id, (id) => fairSetup(actor, id))

  return (
    <div className="p-8">
      <PageHeader eyebrow="Fair randomized papers" title={setup.exam.title} description="Different questions for each candidate, the same level of challenge." />
      <FairPaper examId={setup.exam.id} initial={setup.rules} editable={setup.exam.editable} topics={setup.topics} available={setup.available} />
    </div>
  )
}
