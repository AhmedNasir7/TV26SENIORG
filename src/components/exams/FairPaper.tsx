'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'
import { cellKey, type Level, type Rule } from '@/lib/fair'

type Stats = { easiest: number; hardest: number; spread: number; deviation: number; overlap: number; scores: number[] }
type Evidence = { target: number; random: Stats; balanced: Stats }
type Props = {
  examId: number
  initial: Rule[] | null
  editable: boolean
  topics: Array<{ id: number; name: string }>
  available: Record<string, number>
}

const LEVELS: Level[] = ['EASY', 'MEDIUM', 'HARD']

/** How many of 200 papers landed in each difficulty band. */
function Spread({ title, stats, tone }: { title: string; stats: Stats; tone: string }) {
  const low = 0
  const bands = Array.from({ length: 20 }, (_, i) => stats.scores.filter((s) => Math.min(19, Math.floor((s - low) / 5)) === i).length)
  const tallest = Math.max(1, ...bands)
  return (
    <div className="surface-card p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-[color:var(--muted)]">
        Easiest {stats.easiest} · hardest {stats.hardest} · gap <strong>{stats.spread}</strong>
      </p>
      <div aria-hidden="true" className="mt-4 flex h-24 items-end gap-1">
        {bands.map((count, i) => (
          <span key={i} className="flex-1 rounded-t" style={{ height: `${(count / tallest) * 100}%`, background: tone, minHeight: count ? 3 : 0 }} />
        ))}
      </div>
      <p className="mt-2 flex justify-between text-xs text-[color:var(--muted)]"><span>easier</span><span>harder</span></p>
    </div>
  )
}

export function FairPaper({ examId, initial, editable, topics, available }: Props) {
  const router = useRouter()
  const confirm = useConfirm()
  const blank: Rule = { topicId: topics[0]?.id ?? 0, difficulty: 'EASY', count: 2, marks: 2 }
  const [rules, setRules] = useState<Rule[]>(initial ?? [blank])
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const total = rules.reduce((sum, r) => sum + (r.count || 0) * (r.marks || 0), 0)

  function update(index: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setEvidence(null)
    setMessage('')
  }

  async function run<T>(body: unknown, done: (result: T) => void) {
    setBusy(true)
    setError('')
    try {
      done(await apiRequest<T>(`/api/exams/${examId}/fair`, 'POST', body))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    if (!(await confirm({ title: 'Use a fixed question list instead?', body: 'The fair paper recipe is removed from this draft.', action: 'Use fixed list', danger: true }))) return
    await run({ rules: null }, () => {
      setMessage('This examination uses its fixed question list again.')
      router.refresh()
    })
  }

  if (!topics.length) return <p className="surface-card p-6 text-sm">Add topics and questions to the question bank first.</p>

  return (
    <div className="space-y-6 text-sm">
      <section className="surface-card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Paper recipe</h2>
          <p className="mt-1 text-[color:var(--muted)]">Every candidate gets the same counts and marks, with difficulty balanced across papers.</p>
        </div>
        {rules.map((rule, index) => {
          const have = available[cellKey(rule.topicId, rule.difficulty)] ?? 0
          return (
            <fieldset key={index} disabled={!editable} className="flex flex-wrap items-end gap-3">
              <label>
                <span className="mb-1.5 block font-medium">Topic</span>
                <select value={rule.topicId} onChange={(e) => update(index, { topicId: Number(e.target.value) })} className="input-clean px-3 py-2.5">
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block font-medium">Level</span>
                <select value={rule.difficulty} onChange={(e) => update(index, { difficulty: e.target.value as Level })} className="input-clean px-3 py-2.5">
                  {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block font-medium">Questions</span>
                <input type="number" min={1} max={50} value={rule.count || ''} onChange={(e) => update(index, { count: Number(e.target.value) })} className="input-clean w-24 px-3 py-2.5" />
              </label>
              <label>
                <span className="mb-1.5 block font-medium">Marks each</span>
                <input type="number" min={0.5} step="0.5" value={rule.marks || ''} onChange={(e) => update(index, { marks: Number(e.target.value) })} className="input-clean w-24 px-3 py-2.5" />
              </label>
              <span className={`chip mb-2 ${have < rule.count ? 'chip-danger' : ''}`}>{have} in bank</span>
              {editable && rules.length > 1 && (
                <button type="button" onClick={() => setRules(rules.filter((_, i) => i !== index))} className="btn-ghost mb-0.5 px-3 py-2">Remove</button>
              )}
            </fieldset>
          )
        })}
        <p className="font-medium">Total {total} marks · {rules.reduce((s, r) => s + (r.count || 0), 0)} questions per candidate</p>
        <div className="flex flex-wrap gap-3">
          {editable && <button type="button" onClick={() => setRules([...rules, blank])} className="btn-secondary px-4 py-2.5">Add a rule</button>}
          <button type="button" disabled={busy} onClick={() => run<Evidence>({ rules, preview: true }, setEvidence)} className="btn-secondary px-4 py-2.5">
            Compare 200 papers
          </button>
          {editable && (
            <button type="button" disabled={busy} onClick={() => run({ rules }, () => { setMessage('Saved. Candidates will receive balanced papers.'); router.refresh() })} className="btn-primary px-4 py-2.5">
              Use this recipe
            </button>
          )}
          {editable && initial && <button type="button" disabled={busy} onClick={turnOff} className="btn-ghost px-4 py-2.5">Use a fixed list</button>}
        </div>
        {!editable && <p className="text-[color:var(--muted)]">Published examinations keep their recipe.</p>}
        {message && <p role="status" style={{ color: 'var(--success)' }}>{message}</p>}
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </section>

      {evidence && (
        <section aria-live="polite" className="space-y-3">
          <p>
            Difficulty from 0 (easy) to 100 (hard). An average paper from this bank is <strong>{evidence.target}</strong>.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Spread title="Plain random" stats={evidence.random} tone="var(--muted)" />
            <Spread title="Balanced (used)" stats={evidence.balanced} tone="var(--accent)" />
          </div>
          <p className="text-[color:var(--muted)]">
            Shared questions between neighbouring papers: {evidence.random.overlap}% random, {evidence.balanced.overlap}% balanced. A larger
            bank widens variety; balancing narrows the difficulty gap. Levels start from the declared difficulty and move with real results.
          </p>
        </section>
      )}
    </div>
  )
}
