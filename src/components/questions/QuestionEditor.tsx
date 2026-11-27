'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'
import { OptionsEditor, type DraftOption } from './OptionsEditor'
import { DIFFICULTY_LABEL, TYPE_LABEL, type Difficulty, type QuestionDetail, type QuestionType, type Topic } from './types'

type Props = { question: QuestionDetail | null; topics: Topic[]; onClose: () => void; onSaved: () => void }

const blank = (): DraftOption[] => [1, 2, 3, 4].map((key) => ({ key, text: '', correct: false }))
const field = 'input-clean mt-1 w-full px-3 py-2 text-sm font-normal'

export function QuestionEditor({ question, topics, onClose, onSaved }: Props) {
  const [type, setType] = useState<QuestionType>(question?.type ?? 'SINGLE_CHOICE')
  const [topicId, setTopicId] = useState(String(question?.topicId ?? topics[0]?.id ?? ''))
  const [difficulty, setDifficulty] = useState<Difficulty>(question?.difficulty ?? 'MEDIUM')
  const [text, setText] = useState(question?.text ?? '')
  const [marks, setMarks] = useState(String(question?.marks ?? 1))
  const [options, setOptions] = useState<DraftOption[]>(
    question?.options.length ? question.options.map((o, i) => ({ key: i + 1, text: o.text, correct: o.correct })) : blank()
  )
  const [scoringRule, setScoringRule] = useState(question?.scoringRule ?? 'PARTIAL')
  const [guidance, setGuidance] = useState(question?.guidance ?? '')
  const [maxLength, setMaxLength] = useState(question?.maxLength ? String(question.maxLength) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const features = useFeatures()
  const [checking, setChecking] = useState(false)
  const [review, setReview] = useState<{ verdict: string; problems: string[]; suggestion: string } | null>(null)

  async function check() {
    setChecking(true)
    setReview(null)
    setError('')
    try {
      setReview(
        await apiRequest('/api/ai/check-question', 'POST', {
          type,
          text,
          options: type === 'WRITTEN' ? [] : options.filter((o) => o.text.trim()).map(({ text: optionText, correct }) => ({ text: optionText, correct })),
          ...(guidance.trim() && { guidance }),
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check the question')
    } finally {
      setChecking(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const body = {
      type,
      topicId: Number(topicId),
      difficulty,
      text,
      marks: Number(marks),
      ...(type !== 'WRITTEN' && { options: options.filter((o) => o.text.trim()).map(({ text, correct }) => ({ text, correct })) }),
      ...(type === 'MULTIPLE_CHOICE' && { scoringRule }),
      ...(type === 'WRITTEN' && { guidance: guidance || undefined, maxLength: maxLength ? Number(maxLength) : null }),
    }
    try {
      if (question) await apiRequest(`/api/questions/${question.id}`, 'PATCH', { expectedVersion: question.version, question: body })
      else await apiRequest('/api/questions', 'POST', body)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the question')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-[color:var(--surface)] p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">{question ? 'Edit question' : 'New question'}</DialogTitle>
          <DialogDescription className="text-sm text-[color:var(--muted)]">
            {question ? `Version ${question.version}. Saving changes keeps older papers as they were.` : 'Add a question to your bank.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm font-medium">Type
              <select disabled={Boolean(question)} value={type} onChange={(e) => setType(e.target.value as QuestionType)} className={`${field} disabled:opacity-60`}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Topic
              <select required value={topicId} onChange={(e) => setTopicId(e.target.value)} className={field}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={field}>
                {Object.entries(DIFFICULTY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Marks
              <input type="number" required min="0.01" step="0.01" value={marks} onChange={(e) => setMarks(e.target.value)} className={field} />
            </label>
          </div>
          <label className="block text-sm font-medium">Question
            <textarea required rows={3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} className={field} />
          </label>
          {type !== 'WRITTEN' && <OptionsEditor single={type === 'SINGLE_CHOICE'} options={options} onChange={setOptions} />}
          {type === 'MULTIPLE_CHOICE' && (
            <label className="block text-sm font-medium">Marking
              <select value={scoringRule} onChange={(e) => setScoringRule(e.target.value as typeof scoringRule)} className={field}>
                <option value="PARTIAL">Partial: wrong picks cancel right ones, never below zero</option>
                <option value="ALL_OR_NOTHING">All or nothing</option>
              </select>
            </label>
          )}
          {type === 'WRITTEN' && (
            <>
              <label className="block text-sm font-medium">Marking notes (examiners only)
                <textarea rows={3} maxLength={5000} value={guidance} onChange={(e) => setGuidance(e.target.value)} className={field} />
              </label>
              <label className="block text-sm font-medium">Answer length limit in characters (optional)
                <input type="number" min="50" max="20000" value={maxLength} onChange={(e) => setMaxLength(e.target.value)} className={field} />
              </label>
            </>
          )}
          {question && question.history.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">Earlier versions</summary>
              <ul className="mt-2 space-y-1 text-[color:var(--muted)]">
                {question.history.slice(1).map((v) => <li key={v.version}>v{v.version}: {v.text}</li>)}
              </ul>
            </details>
          )}
          {review && (
            <div role="status" className="surface-card space-y-1 p-3 text-sm">
              <p className="font-medium">{review.verdict === 'good' ? 'Looks good.' : 'Needs work.'}</p>
              {review.problems.length > 0 && <ul className="list-disc pl-5 text-[color:var(--muted)]">{review.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
              {review.suggestion && <p>{review.suggestion}</p>}
            </div>
          )}
          <ErrorToast message={error} />
          <div className="flex justify-end gap-2">
            {features.ai && text.trim().length >= 3 && (
              <button type="button" onClick={() => void check()} disabled={checking} className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">{checking ? 'Checking...' : 'Check with AI'}</button>
            )}
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
