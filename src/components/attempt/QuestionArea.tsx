import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Preferences } from '@/lib/preferences'
import { QuestionGrid, type GridItem } from './QuestionGrid'
import { QuestionView } from './QuestionView'
import type { Draft } from './storage'
import type { Attempt } from './types'

type Props = {
  attempt: Attempt
  items: GridItem[]
  position: number
  drafts: Record<number, Draft>
  readOnly: boolean
  submitDisabled: boolean
  preferences: Preferences
  onGo: (position: number) => void
  onChange: (questionId: number, patch: Partial<Omit<Draft, 'revision'>>) => void
  onReview: () => void
}

/** The navigator, the question or questions in view, and the way forward, laid out as the candidate chose. */
export function QuestionArea(props: Props) {
  const { attempt, items, position, drafts, readOnly, submitDisabled, preferences, onGo, onChange, onReview } = props
  const backAllowed = attempt.exam.allowBackNavigation
  // Without going back only the current question exists on this device, so a list is impossible
  const list = preferences.view === 'list' && backAllowed
  const total = attempt.questions.length
  const shown = list ? attempt.questions : attempt.questions.filter((q) => q.position === position)
  const side = preferences.navigator === 'side'

  return (
    <div className={side ? 'grid items-start gap-4 md:grid-cols-[13rem_minmax(0,1fr)]' : 'space-y-4'}>
      {preferences.navigator !== 'hidden' && <QuestionGrid items={items} current={position} onSelect={onGo} />}
      <div className="min-w-0 space-y-4">
        {shown.map((question) => (
          <div key={question.id} id={`question-${question.position}`} className="scroll-mt-32">
            <QuestionView
              question={question}
              draft={drafts[question.id]}
              readOnly={readOnly}
              onChange={(patch) => onChange(question.id, patch)}
            />
          </div>
        ))}
        {/* Stays at the bottom of the screen, so moving on and submitting are never out of sight */}
        <div className="surface-card sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 p-3 max-lg:pr-20">
          {list ? (
            <span />
          ) : (
            <div className="flex items-center gap-2">
              <button type="button" disabled={!backAllowed || position === 1} onClick={() => onGo(position - 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
              <button type="button" disabled={position === total} onClick={() => onGo(position + 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
              <span className="text-sm text-[color:var(--muted)]">{position} of {total}</span>
            </div>
          )}
          <button type="button" disabled={submitDisabled} onClick={onReview} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">Review and submit<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        {!backAllowed && <p className="text-sm text-[color:var(--muted)]">You cannot return to a question after moving on.</p>}
        <p className="text-xs text-[color:var(--muted)]">Shortcuts: Alt + → next, Alt + ← previous, Alt + M mark for review.</p>
      </div>
    </div>
  )
}
