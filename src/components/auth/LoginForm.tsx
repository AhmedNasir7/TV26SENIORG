'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

import type { DemoLogin } from '@/lib/demo-logins'
import { auth } from '@/lib/firebase/client'

export function LoginForm({ allowSignup, demoAccounts }: { allowSignup: boolean; demoAccounts: DemoLogin[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error?.message || 'Login failed')
        setLoading(false)
        return
      }
      router.push(data.mustChangePassword ? '/change-password' : '/')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      const firebaseSession = await signInWithPopup(auth, provider)
      const idToken = await firebaseSession.user.getIdToken()

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error?.message || 'Google sign-in failed')
        setGoogleLoading(false)
        return
      }

      // App auth is cookie-based; clear Firebase client session.
      await signOut(auth).catch(() => {})

      router.push('/')
      router.refresh()
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : undefined
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.')
      } else {
        setError('Google sign-in failed. Please try again.')
      }
      setGoogleLoading(false)
    }
  }

  return (
    <div className="surface-card p-7 sm:p-8">
      <div className="mb-6">
        <p className="eyebrow">Account access</p>
        <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Use the account your institution gave you.
        </p>
      </div>

      {demoAccounts.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium">Fill a demo account</p>
          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={loading || googleLoading}
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError('')
                }}
                className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-sm)] px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="btn-secondary w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {googleLoading ? (
            'Connecting...'
          ) : (
            <span className="inline-flex items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.2 14.7 2.2 12 2.2 6.9 2.2 2.8 6.3 2.8 11.4S6.9 20.6 12 20.6c6.9 0 9.1-4.8 9.1-7.3 0-.5 0-.8-.1-1.1H12z"
                />
              </svg>
              Continue with Google
            </span>
          )}
        </button>

        <div className="divider" />

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || googleLoading}
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || googleLoading}
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {allowSignup && (
        <>
          <div className="divider my-6" />
          <p className="text-sm text-[color:var(--muted)]">
            New here?{' '}
            <Link href="/signup" className="link-accent">
              Create an account
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
