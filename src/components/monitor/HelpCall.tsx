'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { Video } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'

/** Opens a 100ms video room and sends candidates the code, for live help during the examination. */
export function HelpCall({ examId }: { examId: number }) {
  const features = useFeatures()
  const confirm = useConfirm()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!features.meetings) return null

  async function start() {
    const ok = await confirm({ title: 'Start a live help call?', body: 'Every candidate receives an announcement with the room code.', action: 'Start call' })
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      const room = await apiRequest<{ id: string }>('/api/get-or-create-room', 'POST')
      const result = await apiRequest<{ data?: Array<{ code: string }>; code?: string }>('/api/generate-code', 'POST', { room_id: room.id })
      const roomCode = result.code ?? result.data?.[0]?.code
      if (!roomCode) throw new Error('The video service returned no room code')
      await apiRequest(`/api/exams/${examId}/announcements`, 'POST', {
        message: `Live help is available. Go to /meeting and enter the room code ${roomCode}. Turn your camera on; the call is recorded.`,
      })
      setCode(roomCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the call')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="surface-card flex flex-wrap items-center justify-between gap-3 p-5 text-sm">
      <p>
        <span className="font-medium">Live help</span>
        {code ? <> · room code <strong className="font-mono select-all">{code}</strong></> : ' · talk to candidates by video'}
      </p>
      {code ? (
        <Link href="/meeting" target="_blank" className="btn-primary px-4 py-2.5">Join the room</Link>
      ) : (
        <button type="button" disabled={busy} onClick={start} className="btn-secondary px-4 py-2.5 disabled:opacity-60">
          <Video className="h-4 w-4" aria-hidden="true" /> {busy ? 'Starting...' : 'Start a call'}
        </button>
      )}
      <ErrorToast message={error} />
    </section>
  )
}
