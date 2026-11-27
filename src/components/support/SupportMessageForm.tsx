'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/ToasterProvider'
import { VoiceRecorder } from './VoiceRecorder'
import { useTurnstile } from '@/components/security/useTurnstile'

export function SupportMessageForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const human = useTurnstile('support')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...human.headers },
        body: JSON.stringify({ subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')

      toast.success("Message sent — we'll get back to you by email.")
      setSubject('')
      setMessage('')
      onSubmitted()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit message')
    } finally {
      human.reset()
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-4 p-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Subject</label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="input-clean w-full px-3 py-2.5 text-sm"
          placeholder="What do you need help with?"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-[color:var(--foreground)]">Message</label>
          <VoiceRecorder
            onTranscribed={(text) => setMessage((prev) => (prev ? `${prev} ${text}` : text))}
          />
        </div>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input-clean w-full px-3 py-2.5 text-sm"
          placeholder="Describe your issue or question in detail, or record a voice note"
        />
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Voice notes are transcribed automatically — review the text before sending.
        </p>
      </div>
      {human.widget}
      <button type="submit" disabled={submitting || !human.ready} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
        {submitting ? 'Sending...' : 'Send message'}
      </button>
    </form>
  )
}
