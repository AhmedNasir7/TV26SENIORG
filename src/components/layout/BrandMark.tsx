import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { APP_NAME } from '@/lib/config'

/** Logo: an ink tile with a lime highlighter check, inverting with the theme. */
export function BrandMark({ href = '/', subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-[var(--foreground)] shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:rotate-[-6deg] dark:bg-[var(--highlight)] dark:shadow-[0_0_18px_-4px_rgba(228,242,34,0.6)]">
        <ShieldCheck className="h-4 w-4 text-[color:var(--highlight)] dark:text-[color:var(--highlight-foreground)]" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="font-display block text-[15px] font-semibold">{APP_NAME}</span>
        {subtitle && <span className="block text-xs text-[color:var(--muted)]">{subtitle}</span>}
      </span>
    </Link>
  )
}
