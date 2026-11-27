'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/client/request'

type Clock = { status: 'IN_PROGRESS' | 'SUBMITTED'; serverNow: string; deadlineAt: string }
const RESYNC_MS = 30_000

/**
 * Time left according to the server, counted with the browser's monotonic timer (the device
 * clock is never read). Re-synchronised regularly, on focus and when the network returns.
 */
export function useDeadline(attemptId: number, initial: Clock, onTimeUp: () => void) {
  const [remaining, setRemaining] = useState(() => Date.parse(initial.deadlineAt) - Date.parse(initial.serverNow))
  const sync = useRef({ left: Date.parse(initial.deadlineAt) - Date.parse(initial.serverNow), at: 0 })
  const timeUp = useRef(onTimeUp)

  useEffect(() => {
    timeUp.current = onTimeUp
  }, [onTimeUp])

  const resync = useCallback(async () => {
    try {
      const clock = await apiRequest<Clock>(`/api/attempts/${attemptId}/clock`)
      sync.current = { left: Date.parse(clock.deadlineAt) - Date.parse(clock.serverNow), at: performance.now() }
      if (clock.status !== 'IN_PROGRESS') timeUp.current()
    } catch {
      // Offline: keep counting from the last good reading
    }
  }, [attemptId])

  useEffect(() => {
    sync.current.at = performance.now()
    let fired = false
    const tick = setInterval(() => {
      const left = sync.current.left - (performance.now() - sync.current.at)
      setRemaining(Math.max(0, left))
      if (left <= 0 && !fired) {
        fired = true
        timeUp.current()
      }
      if (left > 0) fired = false // extra time was granted
    }, 500)
    const periodic = setInterval(resync, RESYNC_MS)
    window.addEventListener('focus', resync)
    window.addEventListener('online', resync)
    return () => {
      clearInterval(tick)
      clearInterval(periodic)
      window.removeEventListener('focus', resync)
      window.removeEventListener('online', resync)
    }
  }, [resync])

  return remaining
}
