'use client'

import { toast } from '@/components/ui/ToasterProvider'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { PasswordField } from '@/components/auth/PasswordField'
import { ROLES, roleLabel, type Role } from '@/lib/roles'
import { adminRequest, type Credentials } from './api'

const empty = { email: '', name: '', username: '', password: '' }

export function CreateUserForm({ onCreated }: { onCreated: (credentials: Credentials) => void }) {
  const [values, setValues] = useState(empty)
  const [role, setRole] = useState<Role>('CANDIDATE')
  const [forceChange, setForceChange] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key: keyof typeof empty) => (value: string) => setValues((v) => ({ ...v, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDone('')
    setSaving(true)
    const { email, name, username, password } = values
    try {
      const result = await adminRequest<Omit<Credentials, 'email'>>('/api/admin/users', 'POST', {
        email,
        role,
        name: name || undefined,
        username: username || undefined,
        ...(password && { password, mustChangePassword: forceChange }),
      })
      onCreated({ ...result, email })
      toast.success(`${roleLabel(role)} added`, { description: result.emailed ? `Sign-in details were emailed to ${email}.` : password ? `They sign in with ${username || email} and the password you set.` : 'Share the temporary password shown below.' })
      setValues(empty)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the user')
    } finally {
      setSaving(false)
    }
  }

  const input = (key: 'email' | 'name' | 'username', label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="block text-sm font-medium">
      <span className="mb-2 block">{label}</span>
      <input {...props} value={values[key]} onChange={(e) => set(key)(e.target.value)} className="input-clean w-full px-4 py-3.5 text-[15px] font-normal" />
    </label>
  )

  return (
    <form onSubmit={handleSubmit} className="surface-card mb-8 space-y-6 p-8">
      <h2 className="font-display text-lg font-semibold">Add an account</h2>
      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        <label className="block text-sm font-medium">
          <span className="mb-2 block">Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input-clean w-full px-4 py-3.5 text-[15px] font-normal">
            {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </label>
        {input('name', 'Full name', { type: 'text', maxLength: 100, autoComplete: 'off' })}
        {input('email', 'Email', { type: 'email', required: true, autoComplete: 'off' })}
        {input('username', 'Username (optional)', { type: 'text', maxLength: 30, autoComplete: 'off', placeholder: 'e.g. sara.khan' })}
        <PasswordField label="Password (optional)" autoComplete="new-password" required={false} minLength={8} value={values.password} onChange={set('password')} hint="Leave empty to generate a temporary one" />
        {values.password && (
          <label className="flex items-center gap-3 self-center text-sm">
            <input type="checkbox" checked={forceChange} onChange={(e) => setForceChange(e.target.checked)} className="h-4 w-4" />
            Ask for a new password at first sign-in
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className="btn-primary px-5 py-3 text-sm disabled:opacity-60">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {saving ? 'Adding...' : 'Add account'}
        </button>
        {done && <p role="status" className="text-sm" style={{ color: 'var(--success)' }}>{done}</p>}
        {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </form>
  )
}
