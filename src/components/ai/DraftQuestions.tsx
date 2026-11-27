'use client'

import { Check, Circle, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'
import type { DraftRequest } from '@/lib/services/ai-features'

type Draft = { type: DraftRequest['type']; text: string; options?: Array<{ text: string; correct: boolean }>; guidance?: string }
type Topic = { id: number; name: string }

const label = (v: string) => v.replace('_', ' ').toLowerCase()

/** Drafts questions for review. Only the ones the examiner adds reach the bank. */
export function DraftQuestions({ topics }: { topics: Topic[] }) {
  const features = useFeatures()
  const router = useRouter()
  const [topicId, setTopicId] = useState(topics[0]?.id ?? 0)
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState<DraftRequest['difficulty']>('MEDIUM')
  const [type, setType] = useState<DraftRequest['type']>('SINGLE_CHOICE')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [added, setAdded] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!features.ai || !topics.length) return null

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await apiRequest<{ questions: Draft[] }>('/api/questions/draft', 'POST', { subject, difficulty, type, count: 3 })
      setDrafts(result.questions)
      setAdded([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft questions')
    } finally {
      setBusy(false)
    }
  }

  async function add(draft: Draft, index: number) {
    setError('')
    try {
      await apiRequest('/api/questions', 'POST', {
        topicId,
        difficulty,
        text: draft.text,
        type: draft.type,
        marks: draft.type === 'WRITTEN' ? 5 : 2,
        ...(draft.type === 'WRITTEN'
          ? { guidance: draft.guidance }
          : { options: draft.options, ...(draft.type === 'MULTIPLE_CHOICE' && { scoringRule: 'PARTIAL' }) }),
      })
      setAdded((list) => [...list, index])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add it')
    }
  }

  return (
    <details className="glow-card mb-6 p-5 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> Draft questions with AI
      </summary>
      <form onSubmit={generate} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-60 flex-1">
          <span className="mb-1.5 block font-medium">What should they cover?</span>
          <input required minLength={3} maxLength={200} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. database indexing" className="input-clean w-full px-3 py-2.5" />
        </label>
        <label>
          <span className="mb-1.5 block font-medium">Topic</span>
          <select value={topicId} onChange={(e) => setTopicId(Number(e.target.value))} className="input-clean px-3 py-2.5">
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block font-medium">Level</span>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as DraftRequest['difficulty'])} className="input-clean px-3 py-2.5">
            {['EASY', 'MEDIUM', 'HARD'].map((v) => <option key={v} value={v}>{label(v)}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block font-medium">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as DraftRequest['type'])} className="input-clean px-3 py-2.5">
            {['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN'].map((v) => <option key={v} value={v}>{label(v)}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy} className="btn-primary px-4 py-2.5 disabled:opacity-60">{busy ? 'Drafting...' : 'Draft 3'}</button>
      </form>
      {error && <p role="alert" className="mt-3" style={{ color: 'var(--danger)' }}>{error}</p>}
      <ul className="mt-4 space-y-3">
        {drafts.map((draft, index) => (
          <li key={`${draft.text}-${index}`} className="surface-card p-4">
            <p className="font-medium">{draft.text}</p>
            {draft.options?.map((o) => <p key={o.text} className="mt-1 text-[color:var(--muted)]">{o.correct ? <Check className="mr-2 inline h-4 w-4" aria-label="correct" /> : <Circle className="mr-2 inline h-4 w-4 opacity-40" aria-hidden="true" />}{o.text}</p>)}
            {draft.guidance && <p className="mt-1 text-[color:var(--muted)]">Marking notes: {draft.guidance}</p>}
            <button type="button" disabled={added.includes(index)} onClick={() => add(draft, index)} className="btn-secondary mt-3 px-3 py-2 disabled:opacity-60">
              {added.includes(index) ? 'Added to the bank' : 'Check it, then add'}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
