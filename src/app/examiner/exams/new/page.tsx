import { ExamForm } from '@/components/exams/ExamForm'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { PageHeader } from '@/components/ui/PageHeader'

export default function NewExamPage() {
  return (
    <div className="max-w-3xl p-8">
      <div className="mb-5"><Breadcrumbs items={[{ label: 'Examinations', href: '/examiner' }, { label: 'New examination' }]} /></div>
      <PageHeader eyebrow="Examinations" title="New examination" description="It stays a draft until you publish it." />
      <ExamForm />
    </div>
  )
}
