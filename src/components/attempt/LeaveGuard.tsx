'use client'

import { useEffect, useRef } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { apiRequest } from '@/lib/client/request'

/**
 * Going back out of a running examination cancels it. The Back button is caught and the candidate is
 * asked first; closing or reloading the tab only gets the browser's own warning, because a reload
 * must still be able to resume. Renders nothing.
 */
export function LeaveGuard({ attemptId, sessionId, active }: { attemptId: number; sessionId: string; active: boolean }) {
  const confirm = useConfirm()
  const asking = useRef(false)

  useEffect(() => {
    if (!active) return
    // A spare history entry lets Back be caught without leaving the page
    history.pushState({ examGuard: true }, '', location.href)

    async function onPop() {
      history.pushState({ examGuard: true }, '', location.href)
      if (asking.current) return
      asking.current = true
      const leave = await confirm({
        title: 'Leave the examination?',
        body: 'If you go back now, your examination will be cancelled and it ends immediately. This cannot be undone.',
        action: 'Leave and cancel',
        danger: true,
      })
      asking.current = false
      if (leave === null) return
      try {
        await apiRequest(`/api/attempts/${attemptId}/leave`, 'POST', { sessionId })
      } finally {
        window.location.assign('/candidate')
      }
    }
    function onUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [active, attemptId, confirm, sessionId])

  return null
}
