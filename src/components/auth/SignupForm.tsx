'use client'

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTurnstile } from '@/components/security/useTurnstile'
import { auth } from '@/lib/firebase/client'
import { PasswordField } from './PasswordField'

type ApiBody = { error?: { message?: string; fields?: Record<string, string> } }

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5Z" />
      <path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.5-2-6.4-4.8H1.8v3A11.5 11.5 0 0 0 12 23.5Z" />
      <path fill="#FBBC05" d="M5.6 14.1a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" />
      <path fill="#EA4335" d="M12 5c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.1 11.1 0 0 0 12 .5 11.5 11.5 0 0 0 1.8 6.7l3.8 3C6.5 6.9 9 5 12 5Z" />
    </svg>
  )
}

/** Administrator sign-up, with a password or Google. Google also signs an existing administrator in. */
export function SignupForm({ open }: { open: boolean }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [busy, setBusy] = useState<'form' | 'google' | null>(null)
  const [error, setError] = useState('')
  const human = useTurnstile('signup')

  async function send(url: string, body: object) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...human.headers },
      body: JSON.stringify(body),
    })
    const data: ApiBody = await response.json().catch(() => ({}))
    human.reset()
    if (!response.ok) {
      throw new Error(data.error?.fields ? Object.values(data.error.fields).join('. ') : data.error?.message || 'Sign-up failed')
    }
    router.push('/')
    router.refresh()
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setBusy('form')
    try {
      await send('/api/auth/signup', { name: name || undefined, email, password, setupCode })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed')
      setBusy(null)
    }
  }

  async function google() {
    setError('')
    setBusy('google')
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const session = await signInWithPopup(auth, provider)
      const idToken = await session.user.getIdToken()
      // The application has its own cookie session; the Firebase one isn't kept
      await signOut(auth).catch(() => {})
      await send('/api/auth/google', { idToken, setupCode: setupCode || undefined })
    } catch (err) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/popup-closed-by-user') setError('Google sign-in was cancelled.')
      else if (code) setError('Google sign-in failed. Please try again.')
      else setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <button type="button" onClick={google} disabled={busy !== null || !human.ready} className="btn-secondary w-full justify-center gap-3 px-4 py-3.5 text-[15px] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
        <GoogleMark />
        {busy === 'google' ? 'Connecting...' : 'Continue with Google'}
      </button>

      <div className="flex items-center gap-4 text-xs text-[color:var(--muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" /> or with email <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium">Full name</label>
            <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="input-clean w-full px-4 py-3.5 text-[15px]" />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-clean w-full px-4 py-3.5 text-[15px]" />
          </div>
        </div>
        <PasswordField label="Password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} hint="At least 8 characters" />
        <PasswordField label="Setup code" autoComplete="off" value={setupCode} onChange={setSetupCode} hint={open ? 'From the person who runs this server. Needed for a new account.' : 'No setup code is configured, so new accounts are closed on this server.'} />
        {human.widget}
        <button type="submit" disabled={!open || busy !== null || !human.ready} className="btn-primary w-full justify-center px-4 py-3.5 text-[15px] disabled:opacity-60">
          {busy === 'form' ? 'Creating account...' : 'Create administrator account'}
        </button>
      </form>

      <p className="border-t border-[var(--border)] pt-6 text-sm text-[color:var(--muted)]">
        Already have an account? <Link href="/login" className="link-accent">Sign in</Link>
      </p>
    </div>
  )
}
