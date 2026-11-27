import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/** Where you are, and one click back to any level above. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-4 w-4 text-[color:var(--muted)] opacity-60" aria-hidden="true" />}
              {item.href && !last ? (
                <Link href={item.href} className="rounded-lg px-2.5 py-1.5 font-medium text-[color:var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[color:var(--foreground)]">{item.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="max-w-[18rem] truncate rounded-lg bg-[var(--surface-muted)] px-2.5 py-1.5 font-semibold">{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
