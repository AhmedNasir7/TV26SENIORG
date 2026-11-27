'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { useFeatures } from '@/hooks/useFeatures'

export type ExamValues = {
  id?: number
  title: string
  instructions: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  totalMarks: number
  passMarks: number | null
  liveProctor?: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  allowBackNavigation: boolean
}

/** "2026-11-27T14:30" in the viewer's time zone, as datetime-local inputs expect. */
function toLocalInput(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const field = 'input-clean mt-1 w-full px-3 py-2 text-sm font-normal disabled:opacity-60'
const toggles = [
  ['shuffleQuestions', 'Shuffle question order'],
  ['shuffleOptions', 'Shuffle answer options'],
  ['allowBackNavigation', 'Allow going back to earlier questions'],
] as const

export function ExamForm({ exam, wordingOnly = false }: { exam?: ExamValues; wordingOnly?: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState({
    title: exam?.title ?? '',
    instructions: exam?.instructions ?? '',
    startsAt: toLocalInput(exam?.startsAt ?? ''),
    endsAt: toLocalInput(exam?.endsAt ?? ''),
    durationMinutes: String(exam?.durationMinutes ?? 30),
    totalMarks: String(exam?.totalMarks ?? 10),
    passMarks: exam?.passMarks === null || exam?.passMarks === undefined ? '' : String(exam.passMarks),
    shuffleQuestions: exam?.shuffleQuestions ?? true,
    shuffleOptions: exam?.shuffleOptions ?? true,
    allowBackNavigation: exam?.allowBackNavigation ?? true,
  })
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const features = useFeatures()
  const [drafting, setDrafting] = useState(false)
  const set = (patch: Partial<typeof values>) => setValues((prev) => ({ ...prev, ...patch }))

  /** Fills the box with a draft the examiner then edits; the earlier text is kept if the request fails. */
  async function draftInstructions() {
    setDrafting(true)
    setMessage('')
    try {
      const draft = await apiRequest<{ instructions: string }>('/api/ai/instructions', 'POST', {
        title: values.title.trim() || 'Examination',
        durationMinutes: Number(values.durationMinutes) || 30,
        allowBackNavigation: values.allowBackNavigation,
        live: exam?.liveProctor ?? false,
        ...(values.instructions.trim() && { notes: values.instructions.trim().slice(0, 1000) }),
      })
      set({ instructions: draft.instructions })
      setMessage('Draft written. Read it and edit before saving.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not write a draft')
    } finally {
      setDrafting(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    try {
      const body = wordingOnly
        ? { title: values.title, instructions: values.instructions }
        : {
            ...values,
            startsAt: values.startsAt && new Date(values.startsAt).toISOString(),
            endsAt: values.endsAt && new Date(values.endsAt).toISOString(),
            durationMinutes: Number(values.durationMinutes),
            totalMarks: Number(values.totalMarks),
            passMarks: values.passMarks === '' ? null : Number(values.passMarks),
          }
      const result = await apiRequest<{ exam: { id: number } }>(
        exam?.id ? `/api/exams/${exam.id}` : '/api/exams',
        exam?.id ? 'PATCH' : 'POST',
        body
      )
      if (!exam?.id) router.push(`/examiner/exams/${result.exam.id}`)
      else {
        setMessage('Saved')
        router.refresh()
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const input = (key: keyof typeof values, label: string, type: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-medium">
      {label}
      <input type={type} disabled={wordingOnly && key !== 'title'} value={String(values[key])} onChange={(e) => set({ [key]: e.target.value })} className={field} {...extra} />
    </label>
  )

  return (
    <form onSubmit={save} className="surface-card space-y-4 p-5">
      {input('title', 'Title', 'text', { required: true, maxLength: 200 })}
      <label className="block text-sm font-medium">
        Instructions
        <textarea rows={4} maxLength={10000} value={values.instructions} onChange={(e) => set({ instructions: e.target.value })} className={field} />
      </label>
      {features.ai && (
        <button type="button" onClick={() => void draftInstructions()} disabled={drafting} className="btn-secondary px-3 py-2 text-sm disabled:opacity-60">
          {drafting ? 'Writing...' : 'Draft instructions with AI'}
        </button>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {input('startsAt', 'Opens (your time)', 'datetime-local', { required: true })}
        {input('endsAt', 'Closes (your time)', 'datetime-local', { required: true })}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {input('durationMinutes', 'Duration (minutes)', 'number', { required: true, min: 1, max: 1440 })}
        {input('totalMarks', 'Total marks', 'number', { required: true, min: 0.01, step: 0.01 })}
        {input('passMarks', 'Pass mark (optional)', 'number', { min: 0, step: 0.01 })}
      </div>
      <fieldset disabled={wordingOnly} className="space-y-1 disabled:opacity-60">
        <legend className="mb-1 text-sm font-medium">Settings</legend>
        {toggles.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={values[key]} onChange={(e) => set({ [key]: e.target.checked })} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {saving ? 'Saving...' : exam?.id ? 'Save changes' : 'Create examination'}
        </button>
        {message && <span role="status" className="text-sm">{message}</span>}
      </div>
    </form>
  )
}
