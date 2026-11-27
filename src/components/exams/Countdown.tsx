'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function format(ms: number) {
  const total = Math.ceil(ms / 1000)
  const days = Math.floor(total / 86_400)
  const clock = [Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return days ? `${days}d ${clock}` : clock
}

/**
 * Time until `target`, measured from the server's clock with a monotonic timer, so changing the
 * device clock doesn't move it. Reloads the data when it reaches zero.
 */
export function Countdown({ target, serverNow }: { target: string; serverNow: string }) {
  const router = useRouter()
  const initial = new Date(target).getTime() - new Date(serverNow).getTime()
  const [remaining, setRemaining] = useState(initial)

  useEffect(() => {
    const started = performance.now()
    const timer = setInterval(() => {
      const left = initial - (performance.now() - started)
      setRemaining(Math.max(0, left))
      if (left <= 0) {
        clearInterval(timer)
        router.refresh()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [initial, router])

  return <span className="stat-figure tabular-nums">{format(Math.max(0, remaining))}</span>
}
