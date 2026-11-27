'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { QuestionGrid, type GridItem } from './QuestionGrid'
import { QuestionView } from './QuestionView'
import { ReviewPanel } from './ReviewPanel'
import { readPosition, writePosition } from './storage'
import { TimerBar } from './TimerBar'
import type { Attempt } from './types'
import { isAnswered, useAnswers } from './useAnswers'
import { useDeadline } from './useDeadline'

type Props = { attempt: Attempt; sessionId: string; onChange: (attempt: Attempt) => void; onTakeBack: () => void }

export function RunningAttempt({ attempt, sessionId, onChange, onTakeBack }: Props) {
  const backAllowed = attempt.exam.allowBackNavigation
  const total = attempt.questions.length
  const { drafts, change, save, flush } = useAnswers(attempt, sessionId)
  const [chosen, setChosen] = useState(() => Math.min(readPosition(attempt.id), total))
  // Without going back, the server decides which question is in view
  const position = backAllowed ? chosen : attempt.reachedPosition
  const [reviewing, setReviewing] = useState(false)
  const [takenOver, setTakenOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = useCallback(
    async (timeUp: boolean) => {
      setBusy(true)
      setError('')
      try {
        const allSaved = await flush()
        // When time is up the server submits what it has already accepted
        if (!allSaved && !timeUp) throw new Error('Some answers are not saved yet. Check your connection and try again.')
        const result = await apiRequest<{ attempt: Attempt }>(`/api/attempts/${attempt.id}/submit`, 'POST', { sessionId })
        onChange(result.attempt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not submit. Check your connection and try again.')
        setBusy(false)
      }
    },
    [attempt.id, sessionId, flush, onChange]
  )

  const onTimeUp = useCallback(() => void submit(true), [submit])
  const onTakenOver = useCallback(() => setTakenOver(true), [])
  const remaining = useDeadline(attempt.id, sessionId, attempt, onTimeUp, onTakenOver)
  const readOnly = takenOver || busy || remaining <= 0 || save.kind === 'blocked'

  const go = useCallback(
    async (target: number) => {
      if (target < 1 || target > total) return
      if (target === position) return setReviewing(false) // chosen from the review list
      setReviewing(false)
      setError('')
      if (backAllowed) {
        void flush()
        setChosen(target)
        writePosition(attempt.id, target)
        return
      }
      if (target !== position + 1) return
      // The current answer must reach the server before leaving the question for good
      if (!(await flush())) return setError('Your answer is not saved yet, so you cannot move on.')
      try {
        const result = await apiRequest<{ attempt: Attempt }>(`/api/attempts/${attempt.id}/progress`, 'POST', { sessionId, position: target })
        onChange(result.attempt)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not move on')
      }
    },
    [attempt.id, backAllowed, flush, onChange, position, sessionId, total]
  )

  const question = attempt.questions.find((q) => q.position === position)

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (!event.altKey || !question) return
      if (event.key === 'ArrowRight') void go(position + 1)
      else if (event.key === 'ArrowLeft') void go(position - 1)
      else if (event.key.toLowerCase() === 'm' && !readOnly) {
        change(question.id, { markedForReview: !(drafts[question.id]?.markedForReview ?? question.markedForReview) })
      } else return
      event.preventDefault()
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [change, drafts, go, position, question, readOnly])

  const items: GridItem[] = attempt.questions.map((q) => ({
    position: q.position,
    answered: isAnswered(drafts[q.id], q.answered),
    marked: drafts[q.id]?.markedForReview ?? q.markedForReview,
    disabled: !backAllowed && q.position !== position && q.position !== position + 1,
  }))

  return (
    <div className="space-y-4">
      <TimerBar title={attempt.exam.title} remaining={remaining} save={save} />

      {takenOver && (
        <div role="alert" className="surface-card p-4 text-sm">
          <p>This attempt is open somewhere else, so this window is read only.</p>
          <button type="button" onClick={onTakeBack} className="btn-primary mt-3 px-4 py-2 text-sm">Continue here</button>
        </div>
      )}

      {attempt.exam.instructions && (
        <details className="surface-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">Instructions</summary>
          <p className="mt-2 whitespace-pre-wrap">{attempt.exam.instructions}</p>
        </details>
      )}

      {reviewing ? (
        <ReviewPanel items={items} busy={busy} onSelect={go} onCancel={() => setReviewing(false)} onSubmit={() => submit(false)} />
      ) : (
        <>
          <QuestionGrid items={items} current={position} onSelect={go} />
          {question && (
            <QuestionView key={question.id} question={question} draft={drafts[question.id]} readOnly={readOnly} onChange={(patch) => change(question.id, patch)} />
          )}
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" disabled={!backAllowed || position === 1} onClick={() => go(position - 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Previous</button>
              <button type="button" disabled={position === total} onClick={() => go(position + 1)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Next</button>
            </div>
            <button type="button" disabled={takenOver || busy} onClick={() => setReviewing(true)} className="btn-primary px-5 py-2 text-sm disabled:opacity-50">Review and submit</button>
          </div>
          {!backAllowed && <p className="text-sm text-[color:var(--muted)]">You cannot return to a question after moving on.</p>}
          <p className="text-xs text-[color:var(--muted)]">Shortcuts: Alt + → next, Alt + ← previous, Alt + M mark for review.</p>
        </>
      )}

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      {remaining <= 0 && error && (
        <button type="button" onClick={onTimeUp} className="btn-secondary px-4 py-2 text-sm">Try submitting again</button>
      )}
    </div>
  )
}
