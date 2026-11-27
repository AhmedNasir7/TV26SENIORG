import { QuestionBank } from '@/components/questions/QuestionBank'
import { PageHeader } from '@/components/ui/PageHeader'

export default function QuestionBankPage() {
  return (
    <div className="p-8">
      <PageHeader eyebrow="Question bank" title="Questions" description="Reusable questions by topic and difficulty." />
      <QuestionBank />
    </div>
  )
}
