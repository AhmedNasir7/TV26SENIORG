'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTurnstile } from '@/components/security/useTurnstile'
import type { DemoLogin } from '@/lib/demo-logins'
import { PasswordField } from './PasswordField'

export function LoginForm({ demoAccounts }: { demoAccounts: DemoLogin[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const human = useTurnstile('login')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...human.headers },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      human.reset()
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

  return (
    <div className="space-y-7">
      {demoAccounts.length > 0 && (
        <div>
          <p className="mb-2.5 text-sm font-medium">Fill a demo account</p>
          <div className="grid grid-cols-3 gap-3">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={loading}
                onClick={() => {
                  setEmail(account.email)
                  setPassword(account.password)
                  setError('')
                }}
                className="btn-secondary justify-center px-3 py-2.5 text-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">Email or username</label>
          <input
            id="email"
            type="text"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="input-clean w-full px-4 py-3.5 text-[15px]"
            placeholder="you@example.com"
          />
        </div>
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} disabled={loading} />
        {human.widget}
        <button type="submit" disabled={loading || !human.ready} className="btn-primary group w-full justify-center px-4 py-3.5 text-[15px] disabled:opacity-60">
          {loading ? 'Signing in...' : 'Sign in'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </form>

      <p className="border-t border-[var(--border)] pt-6 text-sm text-[color:var(--muted)]">
        Administrator? <Link href="/signup" className="link-accent">Sign up or continue with Google</Link>
      </p>
    </div>
  )
}
