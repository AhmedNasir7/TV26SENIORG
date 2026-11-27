import { ImportWizard } from '@/components/import/ImportWizard'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/ui/PageHeader'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'
import { listExams } from '@/lib/services/exams'

export default async function ImportPage() {
  const actor = await requirePageUser(STAFF_ROLES)
  const exams = (await listExams(actor)).filter((exam) => exam.phase !== 'COMPLETED')

  return (
    <div className="p-8">
      <div className="mb-6"><Breadcrumbs items={[{ label: 'Examinations', href: '/examiner' }, { label: 'Import' }]} /></div>
      <PageHeader title="Bulk import" description="Add candidates or questions from a file. Nothing is saved until every row is correct." />
      <ImportWizard exams={exams.map(({ id, title }) => ({ id, title }))} />
    </div>
  )
}
