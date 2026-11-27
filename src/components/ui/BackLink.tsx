import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/** One way back, the same everywhere: a round arrow that leans towards where it goes. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <span className="back-link-bead" aria-hidden="true">
        <ArrowLeft className="h-4 w-4" />
      </span>
      {children}
    </Link>
  )
}
