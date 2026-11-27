'use client'

import { toast } from '@/components/ui/ToasterProvider'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'

export function IntegrityCheck() {
  const [busy, setBusy] = useState(false)

  async function check() {
    setBusy(true)
    try {
      const r = await apiRequest<{ intact: boolean; checked: number; brokenAt: number | null }>('/api/admin/audit-logs/verify', 'POST')
      if (r.intact) toast.success('Audit log is intact', { description: `${r.checked} entries verified.` })
      else toast.error('Tampering detected', { description: `The chain breaks at entry ${r.brokenAt}.` })
    } catch (err) {
      toast.error('Could not verify the log', { description: err instanceof Error ? err.message : undefined })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
      <button type="button" disabled={busy} onClick={check} className="btn-secondary px-4 py-2.5">{busy ? 'Checking...' : 'Check the log has not been altered'}</button>
    </div>
  )
}
