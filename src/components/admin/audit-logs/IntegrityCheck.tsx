'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

export function IntegrityCheck() {
  const [text, setText] = useState('')
  const [ok, setOk] = useState(true)
  const [busy, setBusy] = useState(false)

  async function check() {
    setBusy(true)
    try {
      const r = await apiRequest<{ intact: boolean; checked: number; brokenAt: number | null }>('/api/admin/audit-logs/verify', 'POST')
      setOk(r.intact)
      setText(r.intact ? `Intact: ${r.checked} entries verified.` : `Tampering detected at entry ${r.brokenAt}.`)
    } catch (err) {
      setOk(false)
      setText(err instanceof Error ? err.message : 'Could not verify')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
      <button type="button" disabled={busy} onClick={check} className="btn-secondary px-4 py-2.5">{busy ? 'Checking...' : 'Check the log has not been altered'}</button>
      <span role="status" style={{ color: ok ? 'var(--success)' : 'var(--danger)' }}>{text}</span>
    </div>
  )
}
