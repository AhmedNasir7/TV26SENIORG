'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/layout/AppHeader'
import { SupportMessageForm } from '@/components/support/SupportMessageForm'
import { SupportMessageHistory, type SupportMessageItem } from '@/components/support/SupportMessageHistory'

export default function SupportPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<SupportMessageItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/support')
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) loadMessages()
  }, [user, loadMessages])

  if (authLoading || !user) {
    return (
      <div className="page-shell flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex flex-1 items-center justify-center">
          <span className="text-sm text-[color:var(--muted)]">Loading...</span>
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <p className="eyebrow">Support</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[color:var(--foreground)]">
          Get in touch
        </h1>
        <p className="mt-2 max-w-prose text-sm text-[color:var(--muted)]">
          Send us a message and our team will respond by email.
        </p>

        <div className="mt-8 space-y-6">
          <SupportMessageForm onSubmitted={loadMessages} />
          <SupportMessageHistory messages={messages} loading={loading} />
        </div>
      </main>

    </div>
  )
}
