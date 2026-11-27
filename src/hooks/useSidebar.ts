'use client'

import { useSyncExternalStore } from 'react'

const KEY = 'invigil-sidebar'
const EVENT = 'invigil:sidebar'

function read() {
  try {
    return localStorage.getItem(KEY) === 'collapsed'
  } catch {
    return false
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Whether the console side panel is narrowed, remembered on this device. */
export function useSidebar() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false)
  function toggle() {
    try {
      localStorage.setItem(KEY, collapsed ? 'open' : 'collapsed')
    } catch {
      return
    }
    window.dispatchEvent(new Event(EVENT))
  }
  return { collapsed, toggle }
}
