'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isStaff, roleLabel } from '@/lib/roles'

type UserAvatarProps = {
  userId: number
  name: string | null
  email: string
  imageUrl?: string | null
  role?: string | null
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function UserAvatar({
  name,
  email,
  imageUrl,
  role,
  size = 'md',
  showTooltip = true,
}: UserAvatarProps) {
  const [showTooltipState, setShowTooltipState] = useState(false)
  const [imgError, setImgError] = useState(false)

  const displayName = name?.trim() || email.split('@')[0] || 'Anonymous'
  const initial = displayName.charAt(0).toUpperCase()
  const staff = isStaff(role)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => showTooltip && setShowTooltipState(false)}
    >
      <div className={`relative ${sizeClasses[size]} shrink-0`}>
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={displayName}
            width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
            height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
            className="rounded-full border border-[var(--border)] object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} font-display flex items-center justify-center rounded-full border border-[var(--border)] font-semibold`}
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
          >
            {initial}
          </div>
        )}
        {staff && (
          <div
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--surface)]"
            style={{ background: 'var(--accent)' }}
          />
        )}
      </div>

      {showTooltip && showTooltipState && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2">
          <div
            className="whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-xs shadow-[var(--shadow-md)]"
            style={{ background: 'var(--foreground)', color: 'var(--background)' }}
          >
            <div className="font-semibold">{displayName}</div>
            <div className="text-[10px] opacity-70">{email}</div>
            {staff && role && (
              <div className="mt-1 text-[10px] font-medium" style={{ color: 'var(--accent-strong)' }}>
                {roleLabel(role)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
