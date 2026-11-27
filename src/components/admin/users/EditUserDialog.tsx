'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ROLES, roleLabel, type Role } from '@/lib/roles'
import { adminRequest, type UserRow } from './api'

type Props = { user: UserRow; isSelf: boolean; onClose: () => void; onSaved: () => void }

export function EditUserDialog({ user, isSelf, onClose, onSaved }: Props) {
  const [name, setName] = useState(user.name ?? '')
  const [role, setRole] = useState<Role>(user.role)
  const [status, setStatus] = useState(user.status)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await adminRequest(`/api/admin/users/${user.id}`, 'PATCH', {
        name: name.trim() || null,
        ...(!isSelf && { role, status }),
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[color:var(--surface)] p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold">Edit user</DialogTitle>
          <DialogDescription className="text-sm text-[color:var(--muted)]">{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">
            Name
            <input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block text-sm font-medium">
            Role
            <select disabled={isSelf} value={role} onChange={(e) => setRole(e.target.value as Role)} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal disabled:opacity-60">
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Status
            <select disabled={isSelf} value={status} onChange={(e) => setStatus(e.target.value as UserRow['status'])} className="input-clean mt-1.5 w-full px-3 py-2 text-sm font-normal disabled:opacity-60">
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
          <p className="text-xs text-[color:var(--muted)]">
            {isSelf ? 'You cannot change your own role or status.' : 'Changing role or status signs this user out.'}
          </p>
          <ErrorToast message={error} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
