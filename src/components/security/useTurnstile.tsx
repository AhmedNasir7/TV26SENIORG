'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TOKEN_HEADER, type HumanAction } from '@/lib/turnstile'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function loadScript() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('blocked'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Puts the security check into a form. `widget` goes inside the form, `headers` go with the request,
 * `ready` gates the submit button and `reset` must follow every attempt, because tokens work once.
 * When the server has no Turnstile key, nothing is shown and the form is always ready.
 */
export function useTurnstile(action: HumanAction) {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined)
  const [token, setToken] = useState('')
  const [failed, setFailed] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/security/turnstile')
      .then((res) => res.json())
      .then((data: { siteKey: string | null }) => setSiteKey(data.siteKey))
      .catch(() => setSiteKey(null)) // the server still enforces the check
  }, [])

  useEffect(() => {
    if (!siteKey) return
    let live = true
    loadScript()
      .then(() => {
        if (!live || !box.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: siteKey,
          action,
          theme: 'auto',
          callback: (value: string) => {
            setToken(value)
            setFailed(false)
          },
          'expired-callback': () => setToken(''),
          'error-callback': () => {
            setToken('')
            setFailed(true)
          },
        })
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, action])

  const reset = useCallback(() => {
    setToken('')
    if (widgetId.current) window.turnstile?.reset(widgetId.current)
  }, [])

  const widget = siteKey ? (
    <div>
      <div ref={box} />
      {failed && <p role="alert" className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>The security check could not load. Check your connection or content blocker, then reload.</p>}
    </div>
  ) : null

  const headers: Record<string, string> = token ? { [TOKEN_HEADER]: token } : {}
  return { widget, headers, reset, ready: siteKey === null || Boolean(token) }
}
