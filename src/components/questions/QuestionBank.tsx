'use client'

import { useState } from 'react'
import { Pagination } from '@/components/admin/audit-logs/Pagination'
import { apiRequest } from '@/lib/client/request'
import { QuestionEditor } from './QuestionEditor'
import { QuestionFilters } from './QuestionFilters'
import { TopicManager } from './TopicManager'
import { DIFFICULTY_LABEL, TYPE_LABEL, type QuestionDetail, type QuestionRow } from './types'
import { useQuestionList } from './useQuestionList'

export function QuestionBank() {
  const { filters, updateFilter, page, setPage, list, topics, error, setError, reload } = useQuestionList()
  // undefined: closed · null: new question · object: editing
  const [editing, setEditing] = useState<QuestionDetail | null | undefined>(undefined)

  async function act(action: () => Promise<unknown>) {
    try {
      await action()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    }
  }

  const edit = (row: QuestionRow) =>
    act(async () => {
      const data = await apiRequest<{ question: QuestionDetail }>(`/api/questions/${row.id}`)
      setEditing(data.question)
    })

  return (
    <>
      <TopicManager topics={topics} onChanged={reload} />
      <div className="mb-4 flex justify-end">
        <button type="button" disabled={topics.length === 0} onClick={() => setEditing(null)} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          New question
        </button>
      </div>
      <QuestionFilters filters={filters} topics={topics} onChange={updateFilter} showArchived />
      {error && <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      {!list ? (
        <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">Loading questions...</p>
      ) : list.questions.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">No questions match these filters.</p>
      ) : (
        <ul className="surface-card">
          {list.questions.map((q) => (
            <li key={q.id} className="hairline-row flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-sm font-medium">{q.text}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  {q.topic.name} · {TYPE_LABEL[q.type]} · {DIFFICULTY_LABEL[q.difficulty]} · {q.marks} marks · v{q.currentVersion} · used in {q.usedInExams}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => edit(q)} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                <button type="button" onClick={() => act(() => apiRequest(`/api/questions/${q.id}/duplicate`, 'POST'))} className="btn-ghost px-2 py-1 text-xs">Duplicate</button>
                <button type="button" onClick={() => act(() => apiRequest(`/api/questions/${q.id}/archive`, 'POST', { archived: !q.archivedAt }))} className="btn-ghost px-2 py-1 text-xs">
                  {q.archivedAt ? 'Restore' : 'Archive'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list && <Pagination page={page} totalPages={list.totalPages} total={list.total} onPageChange={setPage} />}

      {editing !== undefined && (
        <QuestionEditor
          question={editing}
          topics={editing ? topics.filter((t) => t.ownerId === topics.find((x) => x.id === editing.topicId)?.ownerId) : topics}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); reload() }}
        />
      )}
    </>
  )
}
