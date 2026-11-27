export function PageHeader({
  eyebrow,
  status,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  /** Shown instead of the eyebrow pill, e.g. a <StatusPill /> */
  status?: React.ReactNode
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="page-enter mb-10 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {status ? <div className="mb-3">{status}</div> : eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="font-display text-[32px] font-semibold leading-[40px] tracking-[-0.02em] text-[color:var(--foreground)]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-[22px] text-[color:var(--muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
