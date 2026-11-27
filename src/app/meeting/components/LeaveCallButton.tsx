'use client'

import { useEffect, useRef, useState } from 'react'
import type { HMSPrebuiltRefType } from '@100mslive/roomkit-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * 100ms's own leave-confirmation popover crashes under this project's Radix
 * version tree (roomkit-react pins Radix ~1.0.x while our own shadcn setup
 * needs ~1.3+, and the two don't share floating-ui positioning cleanly) —
 * clicking their built-in leave button throws
 * "Failed to execute 'getComputedStyle' on 'Window'" every time.
 *
 * Rather than patching a vendored dependency tree, we hide their button and
 * drive the same hmsActions.leave() SDK call from our own UI instead.
 */
function hideNativeLeaveButton(): () => void {
  function findByTestId(root: Document | ShadowRoot, id: string): HTMLElement | null {
    const direct = root.querySelector<HTMLElement>(`[data-testid="${id}"]`)
    if (direct) return direct
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const found = findByTestId(el.shadowRoot, id)
        if (found) return found
      }
    }
    return null
  }

  const hide = () => {
    const btn = findByTestId(document, 'leave_room_btn')
    if (btn && btn.style.display !== 'none') {
      btn.style.display = 'none'
    }
  }

  hide()
  const observer = new MutationObserver(hide)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}

export function LeaveCallButton({ hmsRef }: { hmsRef: React.RefObject<HMSPrebuiltRefType | null> }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    cleanupRef.current = hideNativeLeaveButton()
    return () => cleanupRef.current?.()
  }, [])

  async function handleConfirmLeave() {
    setLeaving(true)
    try {
      await hmsRef.current?.hmsActions.leave()
    } catch (err) {
      console.error('Failed to leave room:', err)
    } finally {
      setLeaving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="fixed bottom-5 left-1/2 z-[2000] -translate-x-1/2 rounded-[var(--radius-sm)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-md)] transition-colors"
        style={{ background: 'var(--danger)' }}
      >
        Leave call
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm bg-[color:var(--surface)] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold text-[color:var(--foreground)]">
              Leave call?
            </DialogTitle>
            <DialogDescription className="text-sm text-[color:var(--muted)]">
              You can rejoin with the same room link at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="btn-secondary flex-1 px-4 py-2 text-sm"
              disabled={leaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLeave}
              disabled={leaving}
              className="flex-1 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--danger)' }}
            >
              {leaving ? 'Leaving...' : 'Leave'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
