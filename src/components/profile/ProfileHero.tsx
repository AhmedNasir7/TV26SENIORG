import Image from 'next/image'
import type { RefObject } from 'react'
import type { ProfileUser } from './types'
import { Badge } from '@/components/ui/badge'
import { roleBadgeVariant, roleLabel } from '@/lib/roles'

export function ProfileHero({
  user,
  displayName,
  uploading,
  fileInputRef,
  onAvatarChange,
}: {
  user: ProfileUser
  displayName: string
  uploading: boolean
  fileInputRef: RefObject<HTMLInputElement>
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-8">
          <div className="group relative">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[color:var(--surface-muted)] sm:h-32 sm:w-32">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={displayName}
                  width={128}
                  height={128}
                  className="h-full w-full object-cover"
                  unoptimized={user.imageUrl.includes('supabase')}
                />
              ) : (
                <div
                  className="font-display flex h-full w-full items-center justify-center text-4xl font-semibold"
                  style={{ color: 'var(--accent-strong)', background: 'var(--accent-soft)' }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-[var(--radius)] bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded-[var(--radius-sm)] bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                {uploading ? 'Uploading…' : 'Change photo'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="sr-only"
                disabled={uploading}
                onChange={onAvatarChange}
              />
            </label>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-3xl">
              {displayName}
            </h1>
            <p className="mt-1 text-[color:var(--muted)]">{user.email}</p>
            <div className="mt-2 inline-block">
              <Badge variant={roleBadgeVariant(user.role)}>{roleLabel(user.role)}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
