'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pagination } from '@/components/admin/audit-logs/Pagination'
import { apiRequest } from '@/lib/client/request'

type Person = { id: number; name: string | null; email: string }

export function CandidatePicker({ examId, onEnrolled }: { examId: number; onEnrolled: () => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ candidates: Person[]; total: number; totalPages: number } | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ search, page: String(page) })
      setData(await apiRequest(`/api/exams/${examId}/candidates?${params}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search')
    }
  }, [examId, search, page])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])

  function toggle(ids: number[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }

  async function enrol() {
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/api/exams/${examId}/enrollments`, 'POST', { candidateIds: [...selected] })
      onEnrolled()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enrol')
      setBusy(false)
    }
  }

  const pageIds = data?.candidates.map((c) => c.id) ?? []

  return (
    <section aria-label="Add candidates">
      <input type="search" aria-label="Search candidates to add" placeholder="Search candidates to add" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="input-clean mb-3 w-full px-3 py-2 text-sm" />
      {error && <p role="alert" className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pageIds.length > 0 && pageIds.every((id) => selected.has(id))} onChange={(e) => toggle(pageIds, e.target.checked)} />
          Select this page
        </label>
        <button type="button" disabled={busy || selected.size === 0} onClick={enrol} className="btn-primary px-3 py-2 text-sm disabled:opacity-50">
          Enrol {selected.size || ''} selected
        </button>
      </div>
      <ul className="surface-card">
        {data?.candidates.length === 0 && <li className="p-6 text-sm text-[color:var(--muted)]">No other candidates match.</li>}
        {data?.candidates.map((person) => (
          <li key={person.id} className="hairline-row">
            <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm">
              <input type="checkbox" checked={selected.has(person.id)} onChange={(e) => toggle([person.id], e.target.checked)} />
              <span>
                <span className="font-medium">{person.name || person.email}</span>
                <span className="block text-xs text-[color:var(--muted)]">{person.email}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />}
    </section>
  )
}
