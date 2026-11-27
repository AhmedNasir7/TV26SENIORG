'use client'

import { clearAttemptStorage } from '@/components/attempt/storage'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const fields = [
  { id: 'currentPassword', label: 'Current password', autoComplete: 'current-password' },
  { id: 'newPassword', label: 'New password', autoComplete: 'new-password' },
  { id: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
] as const

type Values = Record<(typeof fields)[number]['id'], string>
const empty: Values = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const [values, setValues] = useState<Values>(empty)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setMessage('')
    if (values.newPassword !== values.confirmPassword) {
      setErrors({ confirmPassword: 'The passwords do not match' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors(data.error?.fields ?? {})
        setMessage(data.error?.message ?? 'Could not change the password')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setMessage('Could not reach the server. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    clearAttemptStorage()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="surface-card p-7">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Change password</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        {forced ? 'Replace your temporary password before you continue.' : 'Other signed-in sessions will be signed out.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {message && (
          <p role="alert" className="rounded-[var(--radius-sm)] px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            {message}
          </p>
        )}
        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.id}
              type="password"
              autoComplete={field.autoComplete}
              required
              value={values[field.id]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
              aria-invalid={Boolean(errors[field.id])}
              className="input-clean w-full px-3 py-2.5 text-sm"
            />
            {errors[field.id] && (
              <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>
                {errors[field.id]}
              </p>
            )}
          </div>
        ))}
        <button type="submit" disabled={saving} className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60">
          {saving ? 'Saving...' : 'Change password'}
        </button>
        <button type="button" onClick={signOut} className="btn-ghost w-full px-4 py-2 text-sm">
          Sign out
        </button>
      </form>
    </div>
  )
}
