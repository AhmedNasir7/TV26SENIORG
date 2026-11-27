'use client'

import { useSyncExternalStore } from 'react'

const noSubscribe = () => () => {}

const local = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) +
  ' ' +
  (new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date(iso)).find((p) => p.type === 'timeZoneName')?.value ?? '')

/** A stored UTC instant shown in the viewer's own time zone. The server renders UTC first. */
export function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noSubscribe,
    () => local(iso),
    () => new Date(iso).toUTCString()
  )
  return <time dateTime={iso}>{text}</time>
}
