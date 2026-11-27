'use client'

import { useCallback, useEffect, useState } from 'react'
import { createSaveQueue, type SaveState } from './saveQueue'
import type { Draft } from './storage'
import type { Attempt } from './types'

const CHOICE_DELAY = 150
const TYPING_DELAY = 800

/** The candidate's answers on screen, saved automatically and restored after a reload. */
export function useAnswers(attempt: Attempt, sessionId: string) {
  const [save, setSave] = useState<SaveState>({ kind: 'saved', at: null })
  const [queue] = useState(() => createSaveQueue(attempt.id, sessionId, setSave))
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(
      attempt.questions
        .filter((q) => q.answer)
        .map((q) => [q.id, { response: q.answer!.response, markedForReview: q.answer!.markedForReview, revision: q.answer!.revision }])
    )
  )

  useEffect(() => {
    // Merge anything that never reached the server before a reload or crash
    const restored = queue.restore((id) => {
      const question = attempt.questions.find((q) => q.id === id)
      return question && !question.hidden ? (question.answer?.revision ?? 0) : undefined
    })
    const timer = setTimeout(() => setDrafts((prev) => ({ ...prev, ...restored })), 0)

    const flushNow = () => {
      if (document.visibilityState === 'hidden') void queue.flush(true)
    }
    const retry = () => void queue.flush()
    // Leaving with unsent answers asks first and makes one last attempt to send them
    const warn = (event: BeforeUnloadEvent) => {
      if (!queue.unsent()) return
      void queue.flush(true)
      event.preventDefault()
    }
    document.addEventListener('visibilitychange', flushNow)
    window.addEventListener('online', retry)
    window.addEventListener('beforeunload', warn)
    return () => {
      clearTimeout(timer)
      queue.stop()
      document.removeEventListener('visibilitychange', flushNow)
      window.removeEventListener('online', retry)
      window.removeEventListener('beforeunload', warn)
    }
    // The queue and attempt id are fixed for the life of this screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, attempt.id])

  const change = useCallback(
    (questionId: number, patch: Partial<Omit<Draft, 'revision'>>) => {
      setDrafts((prev) => {
        const before = prev[questionId] ?? { response: null, markedForReview: false, revision: 0 }
        const next = { ...before, ...patch, revision: before.revision + 1 }
        const typing = next.response !== null && 'text' in next.response
        queue.push(questionId, next, typing ? TYPING_DELAY : CHOICE_DELAY)
        return { ...prev, [questionId]: next }
      })
    },
    [queue]
  )

  return { drafts, change, save, flush: queue.flush }
}

export function isAnswered(draft: Draft | undefined, fallback: boolean) {
  if (!draft) return fallback
  const r = draft.response
  return r !== null && ('text' in r ? r.text.trim() !== '' : r.optionKeys.length > 0)
}
