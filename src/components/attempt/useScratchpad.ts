'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { readPad, writePad, type Pad } from './storage'

const DELAY = 1500
const RETRY = 10_000

/** Rough work: kept on this device at once and on the server shortly after, separately from answers. */
export function useScratchpad(attemptId: number, sessionId: string, writable: boolean) {
  const [pad, setPad] = useState<Pad | null>(null)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const send = useCallback(
    async function push(next: Pad) {
      clearTimeout(timer.current)
      try {
        await apiRequest(`/api/attempts/${attemptId}/scratchpad`, 'PUT', { sessionId, notes: next.notes, drawing: next.drawing })
        writePad(attemptId, { ...next, unsent: false })
        setStatus('Saved')
      } catch {
        setStatus('Kept on this device; will retry')
        timer.current = setTimeout(() => void push(next), RETRY)
      }
    },
    [attemptId, sessionId]
  )

  useEffect(() => {
    let live = true
    const local = readPad(attemptId)
    apiRequest<Pad>(`/api/attempts/${attemptId}/scratchpad`)
      .then((server) => {
        if (!live) return
        // Work typed while offline is newer than the server's copy
        if (local?.unsent) {
          setPad(local)
          if (writable) void send(local)
        } else setPad(server)
      })
      .catch(() => live && setPad(local ?? { notes: '', drawing: [] }))
    return () => {
      live = false
      clearTimeout(timer.current)
    }
    // Loaded once per attempt; writability changes must not reload over what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, send])

  const change = useCallback(
    (patch: Partial<Pad>) => {
      if (!writable || !pad) return
      const next = { ...pad, ...patch, unsent: true }
      setPad(next)
      writePad(attemptId, next)
      setStatus('Saving...')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void send(next), DELAY)
    },
    [attemptId, pad, send, writable]
  )

  return { pad, change, status }
}
