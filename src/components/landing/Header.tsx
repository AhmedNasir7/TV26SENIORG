'use client'

import { ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/layout/LogoMark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { APP_NAME } from '@/lib/config'

const links = [
  { href: '#platform', label: 'Platform' },
  { href: '#records', label: 'Records' },
  { href: '#monitoring', label: 'Monitoring' },
  { href: '#roles', label: 'Who it is for' },
]

/** Sticky header with an announcement bar. It turns dark while a dark section sits under it. */
export function Header() {
  const wrap = useRef<HTMLDivElement>(null)
  const [banner, setBanner] = useState(true)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const check = () => {
      const line = (wrap.current?.getBoundingClientRect().bottom ?? 0) - 1
      setDark([...document.querySelectorAll('[data-header-dark]')].some((node) => {
        const box = node.getBoundingClientRect()
        return box.top <= line && box.bottom > line
      }))
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  return (
    <div ref={wrap} className={`sticky top-0 z-[60] ${dark ? 'lp-dark' : ''}`}>
      {banner && (
        <div className="relative flex h-12 items-center justify-center bg-black px-12 text-white">
          <Link href="/verify" className="group flex items-center gap-2 truncate text-[13px] font-medium">
            Have a result to check? Verify its code
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => setBanner(false)} aria-label="Dismiss announcement" className="absolute right-3 grid h-8 w-8 place-items-center rounded-lg text-white/70 hover:text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      <header className="border-b border-[var(--lp-line)] bg-[color-mix(in_srgb,var(--lp-bg)_92%,transparent)] backdrop-blur-md transition-colors duration-300">
        <nav aria-label="Main" className="lp-frame flex h-[68px] items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <a href="#top" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <LogoMark className="brand-logo h-8 w-8" />
              {APP_NAME}
            </a>
            <ul className="hidden gap-7 text-sm font-medium text-[var(--lp-fg-2)] lg:flex">
              {links.map((link) => <li key={link.href}><a href={link.href} className="transition-colors hover:text-[var(--lp-fg)]">{link.label}</a></li>)}
            </ul>
          </div>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link href="/verify" className="lp-btn lp-btn-outline max-sm:hidden!">Verify a result</Link>
            <Link href="/login" className="lp-btn lp-btn-primary">Sign in</Link>
          </div>
        </nav>
      </header>
    </div>
  )
}
