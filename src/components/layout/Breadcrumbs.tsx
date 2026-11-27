import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

/** Where you are, and one click back to any level above. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted)]" aria-hidden="true" />}
              {item.href && !last ? (
                <Link href={item.href} className="link-accent">{item.label}</Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="max-w-[18rem] truncate font-medium">{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
