import { DIFFICULTY_LABEL, TYPE_LABEL, type Topic } from './types'
import type { QuestionFilterState } from './useQuestionList'

type Props = {
  filters: QuestionFilterState
  topics: Topic[]
  onChange: (patch: Partial<QuestionFilterState>) => void
  showArchived?: boolean
}

const select = 'input-clean px-3 py-2 text-sm'

export function QuestionFilters({ filters, topics, onChange, showArchived }: Props) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <input type="search" aria-label="Search questions" placeholder="Search question text" value={filters.search} onChange={(e) => onChange({ search: e.target.value })} className="input-clean min-w-48 flex-1 px-3 py-2 text-sm" />
      <select aria-label="Topic" value={filters.topicId} onChange={(e) => onChange({ topicId: e.target.value })} className={select}>
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <select aria-label="Type" value={filters.type} onChange={(e) => onChange({ type: e.target.value })} className={select}>
        <option value="">All types</option>
        {Object.entries(TYPE_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select aria-label="Difficulty" value={filters.difficulty} onChange={(e) => onChange({ difficulty: e.target.value })} className={select}>
        <option value="">Any difficulty</option>
        {Object.entries(DIFFICULTY_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      {showArchived && (
        <select aria-label="Archive" value={filters.archived} onChange={(e) => onChange({ archived: e.target.value })} className={select}>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
      )}
    </div>
  )
}
