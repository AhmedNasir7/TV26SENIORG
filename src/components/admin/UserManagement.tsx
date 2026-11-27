'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { roleBadgeVariant, roleLabel } from '@/lib/roles'

interface UserRow {
  id: number
  email: string
  name: string | null
  role: string
  createdAt: string
}

export function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        if (res.status === 403) setError('Access denied')
        return
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add user')
        setAdding(false)
        return
      }
      setSuccess(
        data.temporaryPassword
          ? `User created. Temporary password (shown only once): ${data.temporaryPassword}`
          : 'User created. Credentials have been sent to their email.'
      )
      setEmail('')
      setName('')
      fetchUsers()
    } catch {
      setError('Something went wrong')
    } finally {
      setAdding(false)
    }
  }

  return (
    <>
      <div className="surface-card mb-8 p-6">
        <h2 className="font-display text-lg font-semibold text-[color:var(--foreground)] mb-4">Add user</h2>
        <form onSubmit={handleAddUser} className="max-w-md space-y-4">
          {error && (
            <div className="rounded-[var(--radius-sm)] p-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-[var(--radius-sm)] p-3 text-sm" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
              {success}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="input-clean w-full px-4 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="input-clean w-full px-4 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            A random password is generated. It is emailed if email is set up, otherwise shown here once.
          </p>
          <button type="submit" disabled={adding} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
            {adding ? 'Adding...' : 'Add user & send credentials'}
          </button>
        </form>
      </div>

      <div className="surface-card overflow-hidden">
        <h2 className="font-display border-b border-[var(--border)] p-4 text-lg font-semibold text-[color:var(--foreground)]">
          All users
        </h2>
        {loading ? (
          <div className="p-8 text-center text-sm text-[color:var(--muted)]">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--muted)]">No users yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-[color:var(--muted)]" style={{ background: 'var(--surface-muted)' }}>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hairline-row text-[color:var(--foreground)]">
                    <td className="px-4 py-3">{u.email}</td>
                    <td className="px-4 py-3">{u.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant(u.role)}>{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--muted)]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
