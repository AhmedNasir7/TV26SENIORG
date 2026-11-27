'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (changed: () => void) => {
  document.addEventListener('fullscreenchange', changed)
  return () => document.removeEventListener('fullscreenchange', changed)
}

/** A request, never a block: some devices can't use full screen and must still be able to answer. */
export function FullscreenPrompt() {
  const needed = useSyncExternalStore(
    subscribe,
    () => document.fullscreenEnabled && !document.fullscreenElement,
    () => false
  )
  if (!needed) return null
  return (
    <div role="status" className="surface-card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <p>Your examiner asks you to work in full screen. Leaving it is noted.</p>
      <button type="button" onClick={() => void document.documentElement.requestFullscreen().catch(() => {})} className="btn-secondary px-4 py-2">
        Enter full screen
      </button>
    </div>
  )
}
