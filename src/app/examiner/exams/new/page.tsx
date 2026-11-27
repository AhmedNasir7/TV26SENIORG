import { ExamForm } from '@/components/exams/ExamForm'
import { PageHeader } from '@/components/ui/PageHeader'

export default function NewExamPage() {
  return (
    <div className="max-w-3xl p-8">
      <PageHeader eyebrow="Examinations" title="New examination" description="It stays a draft until you publish it." />
      <ExamForm />
    </div>
  )
}
