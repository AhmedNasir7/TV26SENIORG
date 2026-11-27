'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { connectionState } from '@/lib/connection'

const subscribe = (changed: () => void) => {
  window.addEventListener('online', changed)
  window.addEventListener('offline', changed)
  return () => {
    window.removeEventListener('online', changed)
    window.removeEventListener('offline', changed)
  }
}

/** Combines the browser's online flag with whether the server is actually answering. */
export function useConnection(saveRetrying: boolean) {
  const browserOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  const [checks, setChecks] = useState({ failures: 0, latencyMs: null as number | null, recovering: false })

  useEffect(() => {
    // Back online according to the browser: say "reconnecting" until the server answers
    const returned = () => setChecks((c) => ({ ...c, recovering: true }))
    window.addEventListener('online', returned)
    return () => window.removeEventListener('online', returned)
  }, [])

  const onCheckIn = useCallback(
    (ok: boolean, latencyMs: number) =>
      setChecks((c) => (ok ? { failures: 0, latencyMs, recovering: false } : { ...c, failures: c.failures + 1, recovering: false })),
    []
  )

  return { state: connectionState({ browserOnline, saveRetrying, ...checks }), onCheckIn }
}
