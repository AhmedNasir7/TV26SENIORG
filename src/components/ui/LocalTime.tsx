'use client'

import { useSyncExternalStore } from 'react'
import { formatDateTime, SERVER_ZONE } from '@/lib/format-date'

const noSubscribe = () => () => {}

/** A stored UTC instant shown short, in the viewer's own time zone. */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () => formatDateTime(iso),
    () => formatDateTime(iso, SERVER_ZONE)
  )
  return <time dateTime={iso}>{text}</time>
}
