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

type Handlers = {
  onTimeUp: () => void
  onTakenOver: () => void
  onAnnouncements: (announcements: Announcement[]) => void
  /** Reports every check-in, so the screen can describe the connection */
  onCheckIn: (ok: boolean, latencyMs: number) => void
}

const RESYNC_MS = 15_000
const RETRY_MS = 5000
const TIMEOUT_MS = 8000

/**
 * Time left according to the server, counted with the browser's monotonic timer (the device
 * clock is never read). Re-synchronised regularly, on focus and when the network returns, and
 * more often while check-ins are failing. The same check tells the server this screen is still
 * connected, brings new announcements and reports when another browser has taken the attempt over.
 */
export function useDeadline(attemptId: number, sessionId: string, initial: Clock, handlers: Handlers) {
  const initialLeft = Date.parse(initial.deadlineAt) - Date.parse(initial.serverNow)
  const [remaining, setRemaining] = useState(initialLeft)
  const sync = useRef({ left: initialLeft, at: 0 })
  const latest = useRef(handlers)
  const next = useRef(0)

  useEffect(() => {
    latest.current = handlers
  })

  const resync = useCallback(async () => {
    const started = performance.now()
    next.current = started + RESYNC_MS
    try {
      const clock = await apiRequest<Clock>(
        `/api/attempts/${attemptId}/clock?session=${encodeURIComponent(sessionId)}`,
        'GET',
        undefined,
        { signal: AbortSignal.timeout(TIMEOUT_MS) }
      )
      sync.current = { left: Date.parse(clock.deadlineAt) - Date.parse(clock.serverNow), at: performance.now() }
      latest.current.onCheckIn(true, performance.now() - started)
      if (clock.announcements) latest.current.onAnnouncements(clock.announcements)
      if (clock.status !== 'IN_PROGRESS') latest.current.onTimeUp()
      else if (clock.activeSession === false) latest.current.onTakenOver()
    } catch {
      // Keep counting from the last good reading, and try again soon
      next.current = performance.now() + RETRY_MS
      latest.current.onCheckIn(false, performance.now() - started)
    }
  }, [attemptId, sessionId])

  useEffect(() => {
    sync.current.at = performance.now()
    next.current = performance.now() + RESYNC_MS
    let fired = false
    const tick = setInterval(() => {
      const left = sync.current.left - (performance.now() - sync.current.at)
      setRemaining(Math.max(0, left))
      if (left <= 0 && !fired) {
        fired = true
        latest.current.onTimeUp()
      }
      if (left > 0) fired = false // extra time was granted
      if (performance.now() >= next.current) void resync()
    }, 500)
    window.addEventListener('focus', resync)
    window.addEventListener('online', resync)
    return () => {
      clearInterval(tick)
      window.removeEventListener('focus', resync)
      window.removeEventListener('online', resync)
    }
  }, [resync])

  return { remaining, resync }
}
