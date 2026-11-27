'use client'

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { IntegrityCheck } from '@/components/admin/audit-logs/IntegrityCheck'
import { AuditLogFilters, type AuditLogFilterState } from '@/components/admin/audit-logs/AuditLogFilters'
import { AuditLogTable, type AuditLogEntry } from '@/components/admin/audit-logs/AuditLogTable'
import { Pagination } from '@/components/admin/audit-logs/Pagination'

const emptyFilters: AuditLogFilterState = { action: '', email: '', from: '', to: '' }

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilterState>(emptyFilters)
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  function loadLogs() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (filters.action) params.set('action', filters.action)
    if (filters.email) params.set('email', filters.email)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || [])
        setActions(data.actions || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      })
      .finally(() => setLoading(false))
  }

  function handleFilterChange(next: AuditLogFilterState) {
    setFilters(next)
    setPage(1)
  }

  return (
    <div className="p-8">
      <PageHeader
        eyebrow="Audit logs"
        title="Platform activity"
        description="Every logged action across the platform, searchable and filterable."
      />

      <IntegrityCheck />

      <AuditLogFilters
        filters={filters}
        actions={actions}
        onChange={handleFilterChange}
        onClear={() => handleFilterChange(emptyFilters)}
      />

      <AuditLogTable logs={logs} loading={loading} />

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </div>
  )
}
