'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pagination } from '@/components/admin/audit-logs/Pagination'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { ROLES, roleLabel } from '@/lib/roles'
import { adminRequest, type Credentials, type UserRow } from './users/api'
import { CreateUserForm } from './users/CreateUserForm'
import { CredentialNotice } from './users/CredentialNotice'
import { EditUserDialog } from './users/EditUserDialog'
import { UserTable } from './users/UserTable'

type ListResult = { users: UserRow[]; total: number; totalPages: number; loadedAt: number }
const noFilters = { search: '', role: '', status: '' }

export function UserManagement() {
  const { user: self } = useAuth()
  const [filters, setFilters] = useState(noFilters)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ListResult | null>(null)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState<UserRow | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ ...filters, page: String(page) })
    try {
      const data = await adminRequest<Omit<ListResult, 'loadedAt'>>(`/api/admin/users?${params}`)
      setResult({ ...data, loadedAt: Date.now() })
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    }
  }, [filters, page])

  // Short delay so typing in the search box doesn't send a request per keystroke
  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  function updateFilter(patch: Partial<typeof noFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed')
    } finally {
      setBusy(false)
      setResetting(null)
    }
  }

  const confirmReset = (target: UserRow) =>
    run(async () => {
      const reply = await adminRequest<Omit<Credentials, 'email'>>(`/api/admin/users/${target.id}/reset-password`, 'POST')
      setCredentials({ ...reply, email: target.email })
    })

  return (
    <>
      {credentials && <CredentialNotice credentials={credentials} onDismiss={() => setCredentials(null)} />}
      <CreateUserForm onCreated={(created) => { setCredentials(created); load() }} />

      <div className="mb-4 flex flex-wrap gap-3">
        <input type="search" aria-label="Search users" placeholder="Search name or email" value={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} className="input-clean min-w-56 flex-1 px-3 py-2 text-sm" />
        <select aria-label="Filter by role" value={filters.role} onChange={(e) => updateFilter({ role: e.target.value })} className="input-clean px-3 py-2 text-sm">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel(r)}</option>
          ))}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })} className="input-clean px-3 py-2 text-sm">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {error && <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

      {!result ? (
        <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">Loading users...</p>
      ) : result.users.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-[color:var(--muted)]">No users match these filters.</p>
      ) : (
        <>
          <UserTable
            users={result.users}
            selfId={self?.id}
            now={result.loadedAt}
            onEdit={setEditing}
            onReset={setResetting}
            onUnlock={(target) => run(async () => { await adminRequest(`/api/admin/users/${target.id}`, 'PATCH', { unlock: true }) })}
          />
          <Pagination page={page} totalPages={result.totalPages} total={result.total} onPageChange={setPage} />
        </>
      )}

      {editing && (
        <EditUserDialog user={editing} isSelf={editing.id === self?.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}

      {resetting && (
        <Dialog open onOpenChange={(open) => !open && setResetting(null)}>
          <DialogContent className="max-w-sm bg-[color:var(--surface)] p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-semibold">Reset password?</DialogTitle>
              <DialogDescription className="text-sm text-[color:var(--muted)]">
                {resetting.email} is signed out everywhere and gets a new temporary password.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetting(null)} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              <button type="button" disabled={busy} onClick={() => confirmReset(resetting)} className="btn-primary px-4 py-2 text-sm disabled:opacity-60">
                {busy ? 'Resetting...' : 'Reset password'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
