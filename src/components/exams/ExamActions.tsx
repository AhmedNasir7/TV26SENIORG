'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

type Props = { id: number; isDraft: boolean; canPublish: boolean; canUnpublish: boolean }

export function ExamActions({ id, isDraft, canPublish, canUnpublish }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const publish = (published: boolean) => run(() => apiRequest(`/api/exams/${id}/publish`, 'POST', { published }))
  const duplicate = () =>
    run(async () => {
      const result = await apiRequest<{ exam: { id: number } }>(`/api/exams/${id}/duplicate`, 'POST')
      router.push(`/examiner/exams/${result.exam.id}`)
    })
  const remove = () =>
    run(async () => {
      await apiRequest(`/api/exams/${id}`, 'DELETE')
      router.push('/examiner')
    })

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
      {isDraft &&
        (confirmDelete ? (
          <>
            <button type="button" disabled={busy} onClick={remove} className="btn-danger px-4 py-2 text-sm">Delete this draft</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost px-3 py-2 text-sm">Keep it</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-danger px-4 py-2 text-sm">Delete</button>
        ))}
      {error && <p role="alert" className="w-full text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
