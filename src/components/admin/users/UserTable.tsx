import { formatDate } from '@/lib/format-date'
import { Badge } from '@/components/ui/badge'
import { roleBadgeVariant, roleLabel } from '@/lib/roles'
import type { UserRow } from './api'

type Props = {
  users: UserRow[]
  selfId?: number
  now: number
  onEdit: (user: UserRow) => void
  onReset: (user: UserRow) => void
  onUnlock: (user: UserRow) => void
}

export function UserTable({ users, selfId, now, onEdit, onReset, onUnlock }: Props) {
  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[color:var(--muted)]" style={{ background: 'var(--surface-muted)' }}>
            <th scope="col" className="px-4 py-3 font-medium">User</th>
            <th scope="col" className="px-4 py-3 font-medium">Role</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Joined</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const locked = user.lockedUntil !== null && new Date(user.lockedUntil).getTime() > now
            return (
              <tr key={user.id} className="hairline-row">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.name || '—'}</p>
                  <p className="text-[color:var(--muted)]">{user.email}{user.username && ` · @${user.username}`}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {user.status === 'DISABLED' ? (
                    <Badge variant="destructive">Disabled</Badge>
                  ) : locked ? (
                    <Badge variant="destructive">Locked</Badge>
                  ) : user.mustChangePassword ? (
                    <Badge variant="secondary">Temporary password</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{formatDate(user.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {locked && (
                    <button type="button" onClick={() => onUnlock(user)} className="btn-ghost px-2 py-1 text-xs">Unlock</button>
                  )}
                  <button type="button" onClick={() => onEdit(user)} className="btn-ghost px-2 py-1 text-xs">Edit</button>
                  {user.id !== selfId && (
                    <button type="button" onClick={() => onReset(user)} className="btn-ghost px-2 py-1 text-xs">Reset password</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
