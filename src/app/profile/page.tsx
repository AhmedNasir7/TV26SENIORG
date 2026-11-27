'use client'

import { BackLink } from '@/components/ui/BackLink'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/ToasterProvider'
import { ProfileHero } from '@/components/profile/ProfileHero'
import { ProfileSide } from '@/components/profile/ProfileSide'
import { ProfileTabs } from '@/components/profile/ProfileTabs'
import { ProfileInfoPanel } from '@/components/profile/ProfileInfoPanel'
import { NotificationsPanel } from '@/components/profile/NotificationsPanel'
import type { NotificationItem, ProfileTab, ProfileUser } from '@/components/profile/types'
import { Tabs, TabsContent } from '@/components/ui/tabs'

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, checkAuth } = useAuth()
  const router = useRouter()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login')
      return
    }
    if (authUser) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => {
          setUser(data.user)
          setName(data.user?.name ?? '')
        })
        .catch(() => toast.error('Failed to load profile'))
        .finally(() => setLoading(false))
    }
  }, [authUser, authLoading, router])

  useEffect(() => {
    if (activeTab === 'notifications' && notifications.length === 0) {
      loadNotifications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function loadNotifications() {
    setLoadingNotifications(true)
    try {
      const res = await fetch('/api/notifications?limit=50')
      const data = await res.json()
      if (res.ok) {
        setNotifications(data.notifications || [])
      }
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoadingNotifications(false)
    }
  }

  async function markAsRead(id: number) {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  async function deleteNotification(id: number) {
    await markAsRead(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    toast.success('Notification removed')
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update')
      setUser(data.user)
      setName(data.user?.name ?? '')
      setEditing(false)
      toast.success('Profile updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUser(data.user)
      checkAuth()
      toast.success('Profile photo updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (authLoading || loading) {
    return (
      <div className="page-shell flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <span className="text-sm text-[color:var(--muted)]">Loading...</span>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const displayName = user.name?.trim() || user.email.split('@')[0] || 'User'

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <AppHeader />

      <main className="w-full flex-1">
        <ProfileHero
          user={user}
          displayName={displayName}
          uploading={uploading}
          fileInputRef={fileInputRef}
          onAvatarChange={handleAvatarChange}
        />

        <div className="mx-auto grid max-w-5xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)}>
            <ProfileTabs />

            <TabsContent value="profile">
              <ProfileInfoPanel
                user={user}
                displayName={displayName}
                editing={editing}
                name={name}
                saving={saving}
                onNameChange={setName}
                onStartEdit={() => setEditing(true)}
                onCancelEdit={() => {
                  setEditing(false)
                  setName(user.name ?? '')
                }}
                onSubmit={handleSaveProfile}
              />
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationsPanel
                loading={loadingNotifications}
                notifications={notifications}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            </TabsContent>

          </Tabs>

          <div className="mt-8">
            <BackLink href="/">Back to home</BackLink>
          </div>
          </div>
          <ProfileSide user={user} />
        </div>
      </main>

    </div>
  )
}
