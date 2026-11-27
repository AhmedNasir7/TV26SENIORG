type StatTileProps = {
  label: string
  value: string | number
  delta?: string
  tone?: 'accent' | 'success' | 'muted'
  /** "highlight" (lime) and "glow" (sky → lavender) are the Linear highlighter cards: use one or two per page. */
  variant?: 'plain' | 'highlight' | 'glow'
}

const toneDot: Record<NonNullable<StatTileProps['tone']>, string> = {
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  muted: 'bg-[var(--muted)]',
}

const surface: Record<NonNullable<StatTileProps['variant']>, string> = {
  plain: 'surface-card',
  highlight: 'highlight-card',
  glow: 'glow-card',
}

export function StatTile({ label, value, delta, tone = 'accent', variant = 'plain' }: StatTileProps) {
  const loud = variant !== 'plain'
  return (
    <div className={`${surface[variant]} p-5`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${loud ? 'bg-current opacity-70' : toneDot[tone]}`} />
        <span className={`text-sm ${loud ? 'opacity-75' : 'text-[color:var(--muted)]'}`}>{label}</span>
      </div>
      <div className={`stat-figure mt-3 text-3xl font-semibold ${loud ? '' : 'text-[color:var(--foreground)]'}`}>
        {value}
      </div>
      {delta && (
        <div className={`mt-1 text-xs ${loud ? 'opacity-70' : 'text-[color:var(--muted)]'}`}>{delta}</div>
      )}
    </div>
  )
}
