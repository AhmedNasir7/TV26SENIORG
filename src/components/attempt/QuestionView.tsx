import type { Draft } from './storage'
import type { Attempt } from './types'

type Question = Attempt['questions'][number]
type Props = {
  question: Question
  draft: Draft | undefined
  readOnly: boolean
  onChange: (patch: Partial<Omit<Draft, 'revision'>>) => void
}

export function QuestionView({ question, draft, readOnly, onChange }: Props) {
  const response = draft?.response ?? null
  const keys = response && 'optionKeys' in response ? response.optionKeys : []
  const text = response && 'text' in response ? response.text : ''
  const limit = question.maxLength ?? 20_000
  const single = question.type === 'SINGLE_CHOICE'

  function choose(key: string, on: boolean) {
    const next = single ? [key] : on ? [...keys, key] : keys.filter((k) => k !== key)
    onChange({ response: { optionKeys: next } })
  }

  return (
    <section aria-labelledby={`q-${question.id}`} className="surface-card p-5">
      <p className="text-xs text-[color:var(--muted)]">
        Question {question.position} · {question.marks} marks ·{' '}
        {single ? 'choose one' : question.type === 'MULTIPLE_CHOICE' ? 'choose all that apply' : 'written answer'}
      </p>
      <h2 id={`q-${question.id}`} className="mt-2 whitespace-pre-wrap break-words text-base font-medium">
        {question.text}
      </h2>

      <fieldset disabled={readOnly} className="mt-4 space-y-2 disabled:opacity-70">
        <legend className="sr-only">Your answer</legend>
        {question.options.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2.5 text-sm">
            <input
              type={single ? 'radio' : 'checkbox'}
              name={`answer-${question.id}`}
              checked={keys.includes(option.key)}
              onChange={(e) => choose(option.key, e.target.checked)}
              className="mt-0.5"
            />
            <span className="break-words">{option.text}</span>
          </label>
        ))}
        {question.type === 'WRITTEN' && (
          <>
            <textarea
              aria-label="Your written answer"
              rows={8}
              maxLength={limit}
              value={text}
              onChange={(e) => onChange({ response: { text: e.target.value } })}
              className="input-clean w-full px-3 py-2 text-sm"
            />
            <p className="text-xs text-[color:var(--muted)]">{text.length} of {limit} characters</p>
          </>
        )}
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={readOnly} checked={draft?.markedForReview ?? question.markedForReview} onChange={(e) => onChange({ markedForReview: e.target.checked })} />
          Mark for review
        </label>
        {response !== null && !readOnly && (
          <button type="button" onClick={() => onChange({ response: null })} className="btn-ghost px-2 py-1 text-xs">
            Clear answer
          </button>
        )}
      </div>
    </section>
  )
}
