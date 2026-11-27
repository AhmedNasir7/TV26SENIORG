'use client'

import { toast } from '@/components/ui/ToasterProvider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTurnstile } from '@/components/security/useTurnstile'

export function SendEmailForm() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [to, setTo] = useState('')
  const [sending, setSending] = useState(false)
  const human = useTurnstile('email')
  const [result, setResult] = useState<{ error?: string; data?: { id?: string } } | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return <div className="surface-card p-8 text-sm text-[color:var(--muted)]">Loading...</div>
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setResult(null)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...human.headers },
        body: JSON.stringify({ subject, html, to: to || user.email }),
      })
      const data = await response.json()
      setResult(data)
      if (response.ok) {
        setSubject('')
        setHtml('')
        setTo('')
      }
    } catch {
      setResult({ error: 'Failed to send email' })
    } finally {
      human.reset()
      setSending(false)
    }
  }

  return (
    <div className="surface-card p-7 sm:p-8">
      <div className="mb-6">
        <p className="eyebrow">Communications</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">Send email</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Dispatch a formatted email through Resend.</p>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label htmlFor="to" className="mb-1.5 block text-sm font-medium">
            Recipient (optional)
          </label>
          <input
            id="to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={user.email}
            className="input-clean w-full px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="input-clean w-full px-3 py-2.5 text-sm"
            placeholder="Email subject"
          />
        </div>

        <div>
          <label htmlFor="html" className="mb-1.5 block text-sm font-medium">
            HTML Content
          </label>
          <textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            required
            rows={8}
            className="input-clean w-full px-3 py-2.5 font-mono text-sm"
            placeholder="<p>Your HTML email content</p>"
          />
        </div>

        {human.widget}

        <button
          type="submit"
          disabled={sending || !human.ready}
          className="btn-primary w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </form>

      <ResultToast result={result} />
    </div>
  )
}

/** Shows the outcome of a send as a toast, once per result. */
function ResultToast({ result }: { result: { error?: string; data?: { id?: string } } | null }) {
  useEffect(() => {
    if (!result) return
    if (result.error) toast.error('Email not sent', { description: result.error })
    else toast.success('Email sent', { description: result.data?.id ? `Reference ${result.data.id}` : undefined })
  }, [result])
  return null
}
