type StatTileProps = {
  label: string
  value: string | number
  delta?: string
  tone?: 'accent' | 'success' | 'muted'
}

const toneDot: Record<NonNullable<StatTileProps['tone']>, string> = {
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  muted: 'bg-[var(--muted)]',
}

export function StatTile({ label, value, delta, tone = 'accent' }: StatTileProps) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${toneDot[tone]}`} />
        <span className="text-sm text-[color:var(--muted)]">{label}</span>
      </div>
      <div className="stat-figure mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
        {value}
      </div>
      {delta && (
        <div className="mt-1 text-xs text-[color:var(--muted)]">{delta}</div>
      )}
    </div>
  )
}
