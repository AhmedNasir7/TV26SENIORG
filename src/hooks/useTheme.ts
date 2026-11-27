'use client'

import { useSyncExternalStore } from 'react'
import { currentTheme, THEME_EVENT, type Theme } from '@/lib/theme'

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange)
  return () => window.removeEventListener(THEME_EVENT, onChange)
}

/** The active theme (class on <html>), re-rendering whenever any toggle changes it. */
export function useTheme(): Theme {
  // The server can't know the stored choice; React swaps in the client value after hydration
  return useSyncExternalStore(subscribe, currentTheme, () => 'dark')
}
