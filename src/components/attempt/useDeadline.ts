'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import type { Announcement } from '@/lib/services/announcements'

type Clock = {
  status: 'IN_PROGRESS' | 'SUBMITTED'
  serverNow: string
  deadlineAt: string
  activeSession?: boolean
  announcements?: Announcement[]
}
const RESYNC_MS = 15_000

/**
 * Time left according to the server, counted with the browser's monotonic timer (the device
 * clock is never read). Re-synchronised regularly, on focus and when the network returns.
 * The same check tells the server this screen is still connected, brings new announcements and
 * reports when another browser has taken the attempt over.
 */
export function useDeadline(
  attemptId: number,
  sessionId: string,
  initial: Clock,
  onTimeUp: () => void,
  onTakenOver: () => void,
  onAnnouncements: (announcements: Announcement[]) => void
) {
  const [remaining, setRemaining] = useState(() => Date.parse(initial.deadlineAt) - Date.parse(initial.serverNow))
  const sync = useRef({ left: Date.parse(initial.deadlineAt) - Date.parse(initial.serverNow), at: 0 })
  const handlers = useRef({ onTimeUp, onTakenOver, onAnnouncements })

  useEffect(() => {
    handlers.current = { onTimeUp, onTakenOver, onAnnouncements }
  }, [onTimeUp, onTakenOver, onAnnouncements])

  const resync = useCallback(async () => {
    try {
      const clock = await apiRequest<Clock>(`/api/attempts/${attemptId}/clock?session=${encodeURIComponent(sessionId)}`)
      sync.current = { left: Date.parse(clock.deadlineAt) - Date.parse(clock.serverNow), at: performance.now() }
      if (clock.announcements) handlers.current.onAnnouncements(clock.announcements)
      if (clock.status !== 'IN_PROGRESS') handlers.current.onTimeUp()
      else if (clock.activeSession === false) handlers.current.onTakenOver()
    } catch {
      // Offline: keep counting from the last good reading
    }
  }, [attemptId, sessionId])

  useEffect(() => {
    sync.current.at = performance.now()
    let fired = false
    const tick = setInterval(() => {
      const left = sync.current.left - (performance.now() - sync.current.at)
      setRemaining(Math.max(0, left))
      if (left <= 0 && !fired) {
        fired = true
        handlers.current.onTimeUp()
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
