'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPusherClient } from '@/lib/pusher/client'

type NotificationItem = {
  id: number
  title: string
  message: string
  readAt?: string | null
  createdAt: string
}

const POLL_MS = 15000

export function UserNotificationsBell({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) return
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, POLL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  // Optional instant refresh; polling above still works when Pusher isn't configured
  useEffect(() => {
    const pusher = createPusherClient()
    if (!pusher) return
    pusher.subscribe(`user-notifications-${userId}`).bind('new-notification', () => load())
    return () => pusher.disconnect()
  }, [userId, load])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = async () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (!nextOpen || unreadCount === 0) return
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="btn-ghost relative h-9 w-9"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="surface-card absolute right-0 z-50 mt-2 w-80 overflow-hidden">
          <p className="border-b border-[var(--border)] px-4 py-3 text-sm font-semibold">Notifications</p>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[color:var(--muted)]">
                {loading ? 'Loading...' : 'No notifications yet.'}
              </p>
            ) : (
              notifications.map((item) => (
                <div key={item.id} className="border-b border-[var(--border)] px-4 py-3 text-sm last:border-b-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{item.message}</p>
                  <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
