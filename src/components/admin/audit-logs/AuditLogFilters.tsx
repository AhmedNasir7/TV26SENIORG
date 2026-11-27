export type AuditLogFilterState = {
  action: string
  email: string
  from: string
  to: string
}

export function AuditLogFilters({
  filters,
  actions,
  onChange,
  onClear,
}: {
  filters: AuditLogFilterState
  actions: string[]
  onChange: (next: AuditLogFilterState) => void
  onClear: () => void
}) {
  const hasActiveFilters = filters.action || filters.email || filters.from || filters.to

  return (
    <div className="surface-card mb-6 p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">Action</label>
          <select
            value={filters.action}
            onChange={(e) => onChange({ ...filters, action: e.target.value })}
            className="input-clean w-full px-3 py-2 text-sm"
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">User email</label>
          <input
            type="text"
            value={filters.email}
            onChange={(e) => onChange({ ...filters, email: e.target.value })}
            placeholder="Search by email"
            className="input-clean w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">From</label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="input-clean w-full px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[color:var(--foreground)]">To</label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="input-clean w-full px-3 py-2 text-sm"
          />
        </div>
      </div>
      {hasActiveFilters && (
        <button onClick={onClear} className="link-accent mt-3 text-xs">
          Clear filters
        </button>
      )}
    </div>
  )
}
