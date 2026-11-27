'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CandidateSteps } from '@/components/exams/CandidateSteps'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import { RunningAttempt } from './RunningAttempt'
import { readSession, storeSession } from './session'
import { clearAttemptStorage } from './storage'
import type { Attempt } from './types'

/** `sandbox` is the examiner's trial run of their own examination. */
export function AttemptScreen({ examId, sandbox = false }: { examId: number; sandbox?: boolean }) {
  const router = useRouter()
  const [state, setState] = useState<{ attempt: Attempt; sessionId: string } | null>(null)
  const [error, setError] = useState('')
  const opened = useRef(false)
  const back = sandbox ? `/examiner/exams/${examId}` : `/candidate/exams/${examId}`

  // Resumes only: starting always goes through the explicit button
  const open = useCallback(
    () =>
      apiRequest<{ attempt: Attempt; sessionId: string }>(
        sandbox ? `/api/exams/${examId}/sandbox/open` : `/api/me/exams/${examId}/attempt`,
        'POST',
        { ...(!sandbox && { start: false }), sessionId: readSession(examId, sandbox) }
      )
        .then((result) => {
          storeSession(examId, result.sessionId, sandbox)
          setState(result)
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Could not open the attempt')),
    [examId, sandbox]
  )

  useEffect(() => {
    if (opened.current) return // opening twice would look like a second session
    opened.current = true
    void open()
  }, [open])

  const finished = state !== null && state.attempt.status !== 'IN_PROGRESS'
  useEffect(() => {
    if (!finished) return
    clearAttemptStorage()
    if (sandbox) router.refresh() // the page then shows the marked paper
  }, [finished, router, sandbox])

  const update = useCallback((attempt: Attempt) => setState((prev) => prev && { ...prev, attempt }), [])

  return (
    <main className="page-shell min-h-screen">
      <div className="content-wrap max-w-5xl py-6">
        {sandbox && (
          <div role="status" className="highlight-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm font-medium">
            <p>Sandbox: a trial run. Nothing here counts towards results, monitoring or statistics.</p>
            <Link href={back} className="btn-secondary px-3 py-1.5">Leave sandbox</Link>
          </div>
        )}
        {error ? (
          <div className="surface-card p-6">
            <p role="alert">{error}</p>
            <Link href={back} className="link-accent mt-3 inline-block text-sm">Back to the examination</Link>
          </div>
        ) : !state ? (
          <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">Opening your attempt...</p>
        ) : state.attempt.status === 'IN_PROGRESS' ? (
          // A new session id rebuilds the screen from what the server holds
          <RunningAttempt key={state.sessionId} attempt={state.attempt} sessionId={state.sessionId} onChange={update} onTakeBack={open} />
        ) : (
          <div className="space-y-4">
          {!sandbox && <CandidateSteps current={2} />}
          <div className="surface-card p-6">
            <h1 className="font-display text-2xl font-semibold">Submitted</h1>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {sandbox ? 'Opening the marked paper...' : 'Your result appears on your examinations page once the examiner publishes it.'}
            </p>
            <p className="mt-2 text-sm">
              {state.attempt.submitReason === 'TIME_EXPIRED' ? 'Time ran out and your saved answers were submitted.' : 'Your answers were submitted.'}
              {state.attempt.submittedAt && <> Recorded <LocalTime iso={state.attempt.submittedAt} />.</>}
            </p>
            {state.attempt.receipt && (
              <p className="mt-3 break-all text-xs text-[color:var(--muted)]">Receipt: <span className="select-all font-mono">{state.attempt.receipt}</span></p>
            )}
            <Link href={sandbox ? back : '/candidate'} className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm">
              {sandbox ? 'Back to the examination' : 'Back to your examinations'}
            </Link>
          </div>
          </div>
        )}
      </div>
    </main>
  )
}
