'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import { RunningAttempt } from './RunningAttempt'
import { readSession, storeSession } from './session'
import type { Attempt } from './types'

export function AttemptScreen({ examId }: { examId: number }) {
  const [state, setState] = useState<{ attempt: Attempt; sessionId: string } | null>(null)
  const [error, setError] = useState('')
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return // opening twice would look like a second session
    opened.current = true
    // Resumes only: starting always goes through the explicit button
    apiRequest<{ attempt: Attempt; sessionId: string }>(`/api/me/exams/${examId}/attempt`, 'POST', {
      start: false,
      sessionId: readSession(examId),
    })
      .then((result) => {
        storeSession(examId, result.sessionId)
        setState(result)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not open the attempt'))
  }, [examId])

  return (
    <main className="page-shell min-h-screen">
      <div className="content-wrap max-w-3xl py-6">
        {error ? (
          <div className="surface-card p-6">
            <p role="alert">{error}</p>
            <Link href={`/candidate/exams/${examId}`} className="link-accent mt-3 inline-block text-sm">Back to the examination</Link>
          </div>
        ) : !state ? (
          <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">Opening your attempt...</p>
        ) : state.attempt.status === 'IN_PROGRESS' ? (
          <RunningAttempt attempt={state.attempt} sessionId={state.sessionId} onChange={(attempt) => setState({ ...state, attempt })} />
        ) : (
          <div className="surface-card p-6">
            <h1 className="font-display text-2xl font-semibold">Submitted</h1>
            <p className="mt-2 text-sm">
              {state.attempt.submitReason === 'TIME_EXPIRED' ? 'Time ran out and your saved answers were submitted.' : 'Your answers were submitted.'}
              {state.attempt.submittedAt && <> Recorded <LocalTime iso={state.attempt.submittedAt} />.</>}
            </p>
            {state.attempt.receipt && (
              <p className="mt-3 break-all text-xs text-[color:var(--muted)]">Receipt: <span className="select-all font-mono">{state.attempt.receipt}</span></p>
            )}
            <Link href="/candidate" className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm">Back to your examinations</Link>
          </div>
        )}
      </div>
    </main>
  )
}
