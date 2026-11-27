'use client'

import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { toast } from '@/components/ui/ToasterProvider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StaffSupportCard, type StaffSupportMessage } from '@/components/admin/support/StaffSupportCard'

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<StaffSupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('open')

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/support')
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  async function handleRespond(id: number, response: string) {
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, response }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send response')
      toast.success('Response sent')
      loadMessages()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send response')
    }
  }

  const open = messages.filter((m) => m.status !== 'resolved')
  const resolved = messages.filter((m) => m.status === 'resolved')

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Support"
        title="Support messages"
        description="Respond to messages from users — replies are emailed automatically."
      />

      {loading ? (
        <div className="surface-card p-10 text-center text-sm text-[color:var(--muted)]">Loading...</div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList
            variant="line"
            className="mb-6 h-auto w-full justify-start gap-0 border-b border-[var(--border)] bg-transparent p-0"
          >
            <TabsTrigger
              value="open"
              className="rounded-none border-0 px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] after:bg-[var(--accent)] data-active:bg-transparent data-active:text-[color:var(--accent-strong)] data-active:shadow-none"
            >
              Open ({open.length})
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="rounded-none border-0 px-4 py-2.5 text-sm font-medium text-[color:var(--muted)] after:bg-[var(--accent)] data-active:bg-transparent data-active:text-[color:var(--accent-strong)] data-active:shadow-none"
            >
              Resolved ({resolved.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {open.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No open messages.</p>
            ) : (
              <div className="space-y-4">
                {open.map((m) => (
                  <StaffSupportCard key={m.id} item={m} onRespond={handleRespond} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resolved">
            {resolved.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No resolved messages yet.</p>
            ) : (
              <div className="space-y-4">
                {resolved.map((m) => (
                  <StaffSupportCard key={m.id} item={m} onRespond={handleRespond} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
