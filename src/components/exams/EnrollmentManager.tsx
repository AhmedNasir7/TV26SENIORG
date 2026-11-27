'use client'

import { ErrorToast } from '@/components/ui/Notify'
import { useCallback, useEffect, useState } from 'react'
import { Pagination } from '@/components/admin/audit-logs/Pagination'
import { apiRequest } from '@/lib/client/request'
import { CandidatePicker } from './CandidatePicker'
import { ExtraTimeForm } from './ExtraTimeForm'

export type Enrollment = {
  id: number
  extraMinutes: number
  extraReason: string | null
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
  candidate: { id: number; name: string | null; email: string; status: string }
}

const STATUS = { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', SUBMITTED: 'Submitted', GRADED: 'Graded' }

export function EnrollmentManager({ examId, open }: { examId: number; open: boolean }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ enrollments: Enrollment[]; total: number; totalPages: number } | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [error, setError] = useState('')
  // Bumped after every change so the candidate picker refreshes too
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ search, page: String(page) })
      setData(await apiRequest(`/api/exams/${examId}/enrollments?${params}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates')
    }
  }, [examId, search, page])

  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load, version])

  const changed = () => {
    setEditing(null)
    setError('')
    setVersion((v) => v + 1)
  }

  async function remove(id: number) {
    try {
      await apiRequest(`/api/exams/${examId}/enrollments/${id}`, 'DELETE')
      changed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove')
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section aria-label="Enrolled candidates">
        <input type="search" aria-label="Search enrolled candidates" placeholder="Search enrolled candidates" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="input-clean mb-3 w-full px-3 py-2 text-sm" />
        <ErrorToast message={error} />
        <ul className="surface-card">
          {data?.enrollments.length === 0 && <li className="p-6 text-sm text-[color:var(--muted)]">No candidates enrolled.</li>}
          {data?.enrollments.map((row) => (
            <li key={row.id} className="hairline-row px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{row.candidate.name || row.candidate.email}</p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {row.candidate.email} · {STATUS[row.status]}
                    {row.candidate.status === 'DISABLED' && ' · account disabled'}
                    {row.extraMinutes > 0 && ` · +${row.extraMinutes} min (${row.extraReason})`}
                  </p>
                </div>
                <span className="flex gap-1">
                  {(row.status === 'NOT_STARTED' || row.status === 'IN_PROGRESS') && (
                    <button type="button" onClick={() => setEditing(editing === row.id ? null : row.id)} className="btn-ghost px-2 py-1 text-xs">Extra time</button>
                  )}
                  {row.status === 'NOT_STARTED' && (
                    <button type="button" onClick={() => remove(row.id)} className="btn-ghost px-2 py-1 text-xs">Remove</button>
                  )}
                </span>
              </div>
              {editing === row.id && <ExtraTimeForm examId={examId} enrollment={row} onSaved={changed} />}
            </li>
          ))}
        </ul>
        {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />}
      </section>
      {open ? (
        <CandidatePicker key={version} examId={examId} onEnrolled={changed} />
      ) : (
        <p className="surface-card h-fit p-5 text-sm text-[color:var(--muted)]">Enrolment is closed: this examination has finished.</p>
      )}
    </div>
  )
}
