'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { recordedList } from '@/lib/monitoring'
import { DEFAULT_PREFERENCES } from '@/lib/preferences'
import { AnnouncementList } from './AnnouncementList'
import { DisplaySettings, usePreferences } from './DisplaySettings'
import { FullscreenPrompt } from './FullscreenPrompt'
import { LeaveGuard } from './LeaveGuard'
import { NetworkNotice } from './NetworkNotice'
import { QuestionArea } from './QuestionArea'
import type { GridItem } from './QuestionGrid'
import { RecordedNotice } from './RecordedNotice'
import { ReviewPanel } from './ReviewPanel'
import { ScratchDock } from './ScratchDock'
import { readPosition, writePosition } from './storage'
import { TimerBar } from './TimerBar'
import type { Attempt } from './types'
import { isAnswered, useAnswers } from './useAnswers'
import { useConnection } from './useConnection'
import { useDeadline } from './useDeadline'
import { useMonitoring } from './useMonitoring'

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
  const [announcements, setAnnouncements] = useState(attempt.announcements)
  const display = usePreferences(attempt.preferences)
  const preferences = attempt.isSandbox ? display.preferences : DEFAULT_PREFERENCES
  const connection = useConnection(save.kind === 'retrying')

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
  const { remaining, resync } = useDeadline(attempt.id, sessionId, attempt, {
    onTimeUp,
    onTakenOver: () => setTakenOver(true),
    onAnnouncements: setAnnouncements,
    onCheckIn: connection.onCheckIn,
  })
  // Trial runs record nothing about the examiner's screen
  useMonitoring(attempt.id, sessionId, attempt.monitoring, !attempt.isSandbox && !takenOver && remaining > 0)
  const readOnly = takenOver || busy || remaining <= 0 || save.kind === 'blocked'
  const listView = preferences.view === 'list' && backAllowed

  const go = useCallback(
    async (target: number) => {
      if (target < 1 || target > total) return
      setReviewing(false)
      // In the list view "going to" a question means scrolling to it
      const reveal = () => {
        if (listView) setTimeout(() => document.getElementById(`question-${target}`)?.scrollIntoView({ block: 'start' }), 0)
      }
      if (target === position) return reveal() // chosen from the review list
      setError('')
      if (backAllowed) {
        void flush()
        setChosen(target)
        writePosition(attempt.id, target)
        return reveal()
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
    [attempt.id, backAllowed, flush, listView, onChange, position, sessionId, total]
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
    <div className="exam-prefs space-y-4" data-text={preferences.textSize} data-spacing={preferences.spacing} data-contrast={preferences.contrast}>
      <TimerBar title={attempt.exam.title} remaining={remaining} save={save} connection={connection.state} compact={preferences.timer === 'compact'} />

      <NetworkNotice
        state={connection.state}
        unsaved={'unsaved' in save ? save.unsaved : 0}
        onRetry={() => {
          void flush()
          void resync()
        }}
      />

      {takenOver && (
        <div role="alert" className="surface-card p-4 text-sm">
          <p>This attempt is open somewhere else, so this window is read only.</p>
          <button type="button" onClick={onTakeBack} className="btn-primary mt-3 px-4 py-2 text-sm">Continue here</button>
        </div>
      )}

      <LeaveGuard attemptId={attempt.id} sessionId={sessionId} active={!attempt.isSandbox && !takenOver && remaining > 0} />

      <AnnouncementList announcements={announcements} />

      {!attempt.isSandbox && attempt.monitoring.fullscreen && !takenOver && <FullscreenPrompt />}

      {/* Tools sit together so they are easy to find and stay out of the way of the question */}
      <div aria-label="Examination tools" role="group" className="flex flex-wrap items-start gap-2 [&>details[open]]:w-full">
        {attempt.isSandbox && <DisplaySettings {...display} listAllowed={backAllowed} />}
        {attempt.exam.instructions && (
          <details className="surface-card p-4 text-sm">
            <summary className="cursor-pointer font-medium">Instructions</summary>
            <p className="mt-2 whitespace-pre-wrap">{attempt.exam.instructions}</p>
          </details>
        )}
        <details className="surface-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">What is recorded during this examination</summary>
          <div className="mt-2"><RecordedNotice recorded={recordedList(attempt.monitoring)} /></div>
        </details>
      </div>

      <div className="min-w-0">
          {reviewing ? (
            <ReviewPanel
              items={items}
              busy={busy}
              blocked={connection.state === 'offline' ? 'You are offline. You can submit when the connection returns; your answers are kept.' : undefined}
              onSelect={go}
              onCancel={() => setReviewing(false)}
              onSubmit={() => submit(false)}
            />
          ) : (
            <QuestionArea
              attempt={attempt}
              items={items}
              position={position}
              drafts={drafts}
              readOnly={readOnly}
              submitDisabled={takenOver || busy}
              preferences={preferences}
              onGo={go}
              onChange={change}
              onReview={() => setReviewing(true)}
            />
          )}
      </div>
      <ScratchDock attemptId={attempt.id} sessionId={sessionId} readOnly={takenOver || remaining <= 0} />

      {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      {remaining <= 0 && error && (
        <button type="button" onClick={onTimeUp} className="btn-secondary px-4 py-2 text-sm">Try submitting again</button>
      )}
    </div>
  )
}
