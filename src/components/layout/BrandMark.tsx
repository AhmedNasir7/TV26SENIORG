import Link from 'next/link'
import { APP_NAME } from '@/lib/config'
import { LogoMark } from './LogoMark'

export function BrandMark({ href = '/', subtitle }: { href?: string; subtitle?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      <LogoMark className="brand-logo h-8 w-8 shrink-0 transition-transform duration-500 group-hover:rotate-[60deg]" />
      <span className="leading-tight">
        <span className="font-display block text-[17px] font-semibold tracking-tight">{APP_NAME}</span>
        {subtitle && <span className="block text-xs text-[color:var(--muted)]">{subtitle}</span>}
      </span>
    </Link>
  )
}
