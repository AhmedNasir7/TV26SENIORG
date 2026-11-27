'use client'

import { useState } from 'react'
import { ROLES, roleLabel, type Role } from '@/lib/roles'
import { adminRequest, type Credentials } from './api'

export function CreateUserForm({ onCreated }: { onCreated: (credentials: Credentials) => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('CANDIDATE')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await adminRequest<Omit<Credentials, 'email'>>('/api/admin/users', 'POST', {
        email,
        name: name || undefined,
        role,
      })
      onCreated({ ...result, email })
      setEmail('')
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card mb-6 p-5">
      <h2 className="font-display mb-4 text-base font-semibold">Add user</h2>
      <div className="grid gap-3 md:grid-cols-[1.4fr_1.2fr_0.8fr_auto] md:items-end">
        <label className="text-sm font-medium">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-medium">
          Name
          <input type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-sm font-medium">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal">
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
          {saving ? 'Adding...' : 'Add user'}
        </button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
    </form>
  )
}
