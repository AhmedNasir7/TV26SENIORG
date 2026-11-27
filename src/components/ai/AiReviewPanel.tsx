'use client'

import { Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'
import type { IntegrityReview } from '@/lib/services/ai-features'

const TONE = { low: 'chip-success', medium: 'chip-warning', high: 'chip-danger' } as const

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[color:var(--muted)]">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

/** Asks only when pressed. The saved answer is reused until the records change. */
export function AiReviewPanel({ examId, attemptId }: { examId: number; attemptId: number }) {
  const features = useFeatures()
  const [review, setReview] = useState<IntegrityReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!features.ai) return null

  async function ask() {
    setBusy(true)
    setError('')
    try {
      setReview((await apiRequest<{ review: IntegrityReview }>(`/api/exams/${examId}/ai/integrity`, 'POST', { attemptId })).review)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The review failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="glow-card mb-5 space-y-4 p-6 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5" aria-hidden="true" /> AI review of this attempt
          </h2>
          <p className="opacity-75">Reads the monitoring records, timing and answer similarity. No names are sent.</p>
        </div>
        <button type="button" disabled={busy} onClick={ask} className="btn-primary px-4 py-2.5 disabled:opacity-60">
          {busy ? 'Reading records...' : review ? 'Check again' : 'Review with AI'}
        </button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      {review && (
        <motion.div initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} className="surface-card space-y-4 p-5">
          <p>
            <span className={`chip mr-2 ${TONE[review.attention]}`}>{review.attention} attention</span>
            {review.summary}
          </p>
          <List title="What the records show" items={review.observations} />
          <List title="Possible innocent explanations" items={review.innocentExplanations} />
          <List title="Suggested next steps" items={review.nextSteps} />
          <p className="text-xs text-[color:var(--muted)]">
            A suggestion, not a finding. It cannot prove misconduct and changes no score.{review.cached && ' Saved answer: nothing new since it was made.'}
          </p>
        </motion.div>
      )}
    </section>
  )
}
