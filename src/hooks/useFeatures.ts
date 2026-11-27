'use client'

import { useEffect, useState } from 'react'

export type Features = { speech: boolean; ai: boolean; meetings: boolean; calendar: boolean }
const NONE: Features = { speech: false, ai: false, meetings: false, calendar: false }

let shared: Promise<Features> | null = null

/** Which optional services this server has set up, asked once per page load. */
export function useFeatures() {
  const [features, setFeatures] = useState<Features>(NONE)
  useEffect(() => {
    shared ??= fetch('/api/features')
      .then((res) => (res.ok ? (res.json() as Promise<Features>) : NONE))
      .catch(() => NONE)
    let live = true
    void shared.then((value) => live && setFeatures(value))
    return () => {
      live = false
    }
  }, [])
  return features
}
