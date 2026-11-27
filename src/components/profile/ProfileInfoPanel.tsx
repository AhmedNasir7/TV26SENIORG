import { roleLabel } from '@/lib/roles'
import type { ProfileUser } from './types'

export function ProfileInfoPanel({
  user,
  displayName,
  editing,
  name,
  saving,
  onNameChange,
  onStartEdit,
  onCancelEdit,
  onSubmit,
}: {
  user: ProfileUser
  displayName: string
  editing: boolean
  name: string
  saving: boolean
  onNameChange: (value: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <section className="surface-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-[color:var(--foreground)]">Profile</h2>
          <p className="mt-0.5 text-sm text-[color:var(--muted)]">Your display name and account info</p>
        </div>
        {!editing && (
          <button type="button" onClick={onStartEdit} className="btn-secondary shrink-0 px-4 py-2 text-sm">
            Edit profile
          </button>
        )}
      </div>
      <div className="px-6 py-6">
        {editing ? (
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Display name</label>
              <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Your name" className="input-clean w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={onCancelEdit} className="btn-secondary px-4 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-x-10 gap-y-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Name</dt>
              <dd className="mt-1.5 font-medium text-[color:var(--foreground)]">{displayName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Role</dt>
              <dd className="mt-1.5 font-medium text-[color:var(--foreground)]">{roleLabel(user.role)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">Email</dt>
              <dd className="mt-1.5 break-all font-medium text-[color:var(--foreground)]">{user.email}</dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  )
}
