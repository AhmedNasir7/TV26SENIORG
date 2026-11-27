'use client'

import { ErrorToast, SuccessToast } from '@/components/ui/Notify'
import { toast } from '@/components/ui/ToasterProvider'
import { useState } from 'react'
import { Pagination } from '@/components/admin/audit-logs/Pagination'
import { apiRequest } from '@/lib/client/request'
import { roundMarks } from '@/lib/grading'
import { QuestionFilters } from './QuestionFilters'
import { DIFFICULTY_LABEL, TYPE_LABEL, type Difficulty, type QuestionType } from './types'
import { useQuestionList } from './useQuestionList'
import { ListPlus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

type Item = { questionId: number; marks: number; text: string; type: QuestionType; difficulty: Difficulty; topic: string }
type Data = {
  exam: { id: number; ownerId: number; totalMarks: number; editable: boolean }
  items: Item[]
}

export function ExamQuestionPicker({ initial }: { initial: Data }) {
  const { exam } = initial
  const [items, setItems] = useState(initial.items)
  const [examTotal, setExamTotal] = useState(exam.totalMarks)
  const [syncTotal, setSyncTotal] = useState(false)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const bank = useQuestionList(exam.ownerId)

  const total = roundMarks(items.reduce((sum, item) => sum + item.marks, 0))
  const chosen = new Set(items.map((item) => item.questionId))

  function move(index: number, by: number) {
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    setItems(next)
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const data = await apiRequest<Data>(`/api/exams/${exam.id}/questions`, 'PUT', {
        items: items.map(({ questionId, marks }) => ({ questionId, marks })),
        syncTotal,
      })
      setItems(data.items)
      setExamTotal(data.exam.totalMarks)
      setMessage('')
      toast.success('Questions saved')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section aria-label="Selected questions">
        <p className="mb-3 text-sm" style={{ color: total === examTotal ? 'var(--success)' : 'var(--danger)' }}>
          {items.length} questions · {total} of {examTotal} marks{total === examTotal ? '' : ' · totals do not match'}
        </p>
        <ol className="surface-card">
          {items.length === 0 && <li><EmptyState icon={ListPlus} title="No questions selected" description="Pick questions from the bank to build this paper." /></li>}
          {items.map((item, index) => (
            <li key={item.questionId} className="hairline-row flex items-start gap-3 px-4 py-3">
              <span className="text-sm text-[color:var(--muted)]">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm">{item.text}</p>
                <p className="text-xs text-[color:var(--muted)]">{item.topic} · {TYPE_LABEL[item.type]} · {DIFFICULTY_LABEL[item.difficulty]}</p>
              </div>
              <input type="number" min="0.01" step="0.01" aria-label={`Marks for question ${index + 1}`} disabled={!exam.editable} value={item.marks} onChange={(e) => setItems(items.map((i) => (i.questionId === item.questionId ? { ...i, marks: Number(e.target.value) } : i)))} className="input-clean w-20 px-2 py-1 text-sm" />
              {exam.editable && (
                <span className="flex">
                  <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">↑</button>
                  <button type="button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">↓</button>
                  <button type="button" onClick={() => setItems(items.filter((i) => i.questionId !== item.questionId))} className="btn-ghost px-2 py-1 text-xs">Remove</button>
                </span>
              )}
            </li>
          ))}
        </ol>
        {exam.editable && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" disabled={saving} onClick={save} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save questions'}</button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={syncTotal} onChange={(e) => setSyncTotal(e.target.checked)} />
              Set the exam total to {total}
            </label>
            <SuccessToast message={message} />
          </div>
        )}
      </section>

      {exam.editable && (
        <section aria-label="Question bank">
          <QuestionFilters filters={bank.filters} topics={bank.topics} onChange={bank.updateFilter} />
          <ErrorToast message={bank.error} />
          <ul className="surface-card">
            {bank.list?.questions.map((q) => (
              <li key={q.id} className="hairline-row flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm">{q.text}</p>
                  <p className="text-xs text-[color:var(--muted)]">{q.topic.name} · {DIFFICULTY_LABEL[q.difficulty]} · {q.marks} marks</p>
                </div>
                <button type="button" disabled={chosen.has(q.id)} onClick={() => setItems([...items, { questionId: q.id, marks: q.marks, text: q.text, type: q.type, difficulty: q.difficulty, topic: q.topic.name }])} className="btn-secondary px-3 py-1 text-xs disabled:opacity-50">
                  {chosen.has(q.id) ? 'Added' : 'Add'}
                </button>
              </li>
            ))}
          </ul>
          {bank.list && <Pagination page={bank.page} totalPages={bank.list.totalPages} total={bank.list.total} onPageChange={bank.setPage} />}
        </section>
      )}
    </div>
  )
}
