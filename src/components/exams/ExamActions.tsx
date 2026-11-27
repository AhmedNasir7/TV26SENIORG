'use client'

import { toast } from '@/components/ui/ToasterProvider'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'

type Props = { id: number; isDraft: boolean; canPublish: boolean; canUnpublish: boolean }

export function ExamActions({ id, isDraft, canPublish, canUnpublish }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
    }
  }

  async function publish(published: boolean) {
    const ok = await confirm(
      published
        ? { title: 'Publish this examination?', body: 'Enrolled candidates will see it and be notified.', action: 'Publish' }
        : { title: 'Unpublish it?', body: 'It returns to draft and candidates no longer see it.', action: 'Unpublish', danger: true }
    )
    if (ok) {
      await run(async () => {
        await apiRequest(`/api/exams/${id}/publish`, 'POST', { published })
        if (published) toast.success('Examination published', { description: 'Enrolled candidates can see it now and have been told.' })
        else toast.success('Back to draft', { description: 'Candidates no longer see this examination.' })
      })
    }
  }
  const duplicate = () =>
    run(async () => {
      const result = await apiRequest<{ exam: { id: number } }>(`/api/exams/${id}/duplicate`, 'POST')
      toast.success('Examination duplicated', { description: 'You are now editing the copy.' })
      router.push(`/examiner/exams/${result.exam.id}`)
    })
  async function remove() {
    if (!(await confirm({ title: 'Delete this draft?', body: 'This cannot be undone.', action: 'Delete draft', danger: true }))) return
    await run(async () => {
      await apiRequest(`/api/exams/${id}`, 'DELETE')
      toast.success('Draft deleted')
      router.push('/examiner')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isDraft && (
        <button type="button" disabled={busy || !canPublish} onClick={() => publish(true)} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
          Publish
        </button>
      )}
      {canUnpublish && (
        <button type="button" disabled={busy} onClick={() => publish(false)} className="btn-secondary px-4 py-2 text-sm">
          Unpublish
        </button>
      )}
      <button type="button" disabled={busy} onClick={duplicate} className="btn-secondary px-4 py-2 text-sm">
        Duplicate
      </button>
      {isDraft && (
        <button type="button" disabled={busy} onClick={remove} className="btn-danger px-4 py-2 text-sm">Delete</button>
      )}
      {error && <p role="alert" className="w-full text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
