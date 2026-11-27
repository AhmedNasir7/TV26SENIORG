'use client'

import { useEffect } from 'react'
import { apiRequest, RequestError } from '@/lib/client/request'
import type { MonitoringSettings } from '@/lib/monitoring'
import { readEvents, writeEvents, type MonitorEvent } from './storage'

const BATCH = 20
const MAX_QUEUED = 100
const SEND_DELAY = 1000
const RETRY_MS = 15_000
// Focus moving for under a second is the browser's own doing more often than the candidate's
const MIN_BLUR_MS = 1000

/**
 * Reports only what this examination is configured to record, and never any answer or clipboard
 * text. Events noted while offline wait in local storage and are sent on reconnecting.
 */
export function useMonitoring(attemptId: number, sessionId: string, settings: MonitoringSettings, active: boolean) {
  const { tabHidden, windowBlur, offline, paste, fullscreen, minAwaySeconds } = settings

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let sending = false

    async function send() {
      if (sending) return
      const batch = readEvents(attemptId).slice(0, BATCH)
      if (!batch.length) return
      sending = true
      let done = false
      try {
        await apiRequest(`/api/attempts/${attemptId}/events`, 'POST', { sessionId, events: batch }, { keepalive: true })
        done = true
      } catch (error) {
        const status = error instanceof RequestError ? error.status : 0
        // A refused batch can never succeed; anything else is retried later
        done = status >= 400 && status < 500 && status !== 429
      }
      sending = false
      if (done) {
        writeEvents(attemptId, readEvents(attemptId).slice(batch.length))
        schedule(SEND_DELAY)
      }
    }

    function schedule(delay: number) {
      clearTimeout(timer)
      timer = setTimeout(() => void send(), delay)
    }

    function report(event: MonitorEvent) {
      writeEvents(attemptId, [...readEvents(attemptId), event].slice(-MAX_QUEUED))
      schedule(SEND_DELAY)
    }

    // Durations use the monotonic timer, so changing the device clock changes nothing
    const secondsSince = (start: number) => Math.round((performance.now() - start) / 1000)
    let hiddenAt: number | null = null
    let blurredAt: number | null = null
    let offlineAt: number | null = navigator.onLine ? null : performance.now()
    let wasFullscreen = Boolean(document.fullscreenElement)

    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = performance.now()
        blurredAt = null // switching tabs is one event, not two
      } else if (hiddenAt !== null) {
        const seconds = secondsSince(hiddenAt)
        hiddenAt = null
        if (tabHidden && seconds >= minAwaySeconds) report({ type: 'TAB_HIDDEN', seconds })
      }
    }
    function onBlur() {
      if (document.visibilityState === 'visible') blurredAt = performance.now()
    }
    function onFocus() {
      if (blurredAt === null) return
      const away = performance.now() - blurredAt
      const seconds = secondsSince(blurredAt)
      blurredAt = null
      if (windowBlur && away >= MIN_BLUR_MS && seconds >= minAwaySeconds) report({ type: 'WINDOW_BLUR', seconds })
    }
    function onOffline() {
      offlineAt ??= performance.now()
    }
    function onOnline() {
      if (offlineAt !== null && offline) report({ type: 'OFFLINE', seconds: secondsSince(offlineAt) })
      offlineAt = null
      schedule(SEND_DELAY)
    }
    function inserted(target: EventTarget | null, text: string) {
      // Rough work is private: pasting into the scratchpad is not an answer
      const answerBox = target instanceof HTMLTextAreaElement && !target.closest('[data-scratchpad]')
      if (paste && answerBox && text.length) report({ type: 'PASTE', characters: text.length })
    }
    const onPaste = (event: ClipboardEvent) => inserted(event.target, event.clipboardData?.getData('text') ?? '')
    const onDrop = (event: DragEvent) => inserted(event.target, event.dataTransfer?.getData('text') ?? '')
    function onFullscreen() {
      const now = Boolean(document.fullscreenElement)
      if (fullscreen && wasFullscreen && !now) report({ type: 'FULLSCREEN_EXIT' })
      wasFullscreen = now
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('paste', onPaste, true)
    document.addEventListener('drop', onDrop, true)
    document.addEventListener('fullscreenchange', onFullscreen)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    const retry = setInterval(() => void send(), RETRY_MS)
    schedule(SEND_DELAY) // anything left from before a reload

    return () => {
      clearTimeout(timer)
      clearInterval(retry)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('paste', onPaste, true)
      document.removeEventListener('drop', onDrop, true)
      document.removeEventListener('fullscreenchange', onFullscreen)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [active, attemptId, sessionId, tabHidden, windowBlur, offline, paste, fullscreen, minAwaySeconds])
}
