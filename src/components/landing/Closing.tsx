import Link from 'next/link'
import type { CSSProperties } from 'react'
import { LogoMark } from '@/components/layout/LogoMark'
import { roles, steps } from '@/content/landing'
import { APP_NAME } from '@/lib/config'
import { BlurIn, Shot, Streaks } from './motion'

export function Roles() {
  return (
    <section id="roles" className="border-b border-[var(--lp-line)] bg-[var(--lp-bg-2)]">
      <div className="lp-frame">
        <div className="lp-rails">
          <BlurIn className="px-6 py-24 lg:px-16">
            <p className="lp-eyebrow">Who it is for</p>
            <h2 className="lp-h2 mt-6">Three people, three clear screens.</h2>
          </BlurIn>
          <ul className="grid gap-px border-t border-[var(--lp-line)] bg-[var(--lp-line)] lg:grid-cols-3">
            {roles.map((role, i) => (
              <li key={role.title} className="group bg-[var(--lp-bg-2)]">
                <BlurIn delay={i * 0.12} className="flex h-full flex-col p-8 lg:p-10">
                  <h3 className="text-xl font-semibold">{role.title}</h3>
                  <p className="mt-2 text-[var(--lp-fg-2)]">{role.body}</p>
                  <div className="mt-8 overflow-hidden rounded-xl border border-[var(--lp-line)] shadow-[0_16px_32px_-16px_rgb(0_0_0/0.15)]">
                    <Shot name={role.image} alt={`${role.title} screen`} className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-105" />
                  </div>
                </BlurIn>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function Steps() {
  return (
    <section className="bg-[var(--lp-bg)]">
      <div className="lp-frame">
        <div className="lp-rails">
          <BlurIn className="px-6 pb-16 pt-28 lg:px-16">
            <p className="lp-eyebrow">How it runs</p>
            <h2 className="lp-h2 mt-6">From draft to verified result.</h2>
          </BlurIn>
          <ol className="grid border-t border-[var(--lp-line)] sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.title} className="group relative flex flex-col border-l border-[var(--lp-line)] pt-8 first:border-l-0">
                <span aria-hidden="true" className="absolute inset-y-0 -left-px w-px origin-bottom scale-y-0 bg-[var(--lp-fg-3)] transition-transform duration-300 group-hover:scale-y-100" />
                <div className="grow px-7">
                  <p className="text-[13px] font-medium text-[var(--lp-fg-3)]">{step.when}</p>
                  <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-2 text-[var(--lp-fg-2)]">{step.body}</p>
                </div>
                <div aria-hidden="true" className="mt-10 flex h-14 justify-evenly">
                  {Array.from({ length: 21 }, (_, i) => <span key={i} className="lp-tick block h-full w-px" style={{ '--idx': i } as CSSProperties} />)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function FinalCta() {
  return (
    <section data-header-dark className="lp-dark relative overflow-hidden border-t border-[var(--lp-line)]">
      <div className="pointer-events-none absolute inset-0 text-white/[0.035] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_50%,transparent_35%,#000_75%)]">
        <div className="lp-stripes absolute inset-0" />
        <Streaks color="rgb(138,147,161)" opacity={0.45} />
      </div>
      <BlurIn y={8} className="lp-frame relative flex flex-col items-center gap-9 py-32 text-center">
        <h2 className="lp-display max-w-[12em] text-balance font-medium leading-none tracking-[-0.025em]" style={{ fontSize: 'clamp(2.25rem, 1.6rem + 2.5vw, 3.75rem)' }}>
          Run the next examination with a clear record
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/verify" className="lp-btn lp-btn-outline">Verify a result</Link>
          <Link href="/login" className="lp-btn lp-btn-primary">Sign in</Link>
        </div>
      </BlurIn>
      <footer className="relative border-t border-[var(--lp-line)]">
        <div className="lp-frame flex flex-wrap items-center justify-between gap-4 py-10 text-sm text-[var(--lp-fg-2)]">
          <p className="flex items-center gap-2.5 font-semibold text-[var(--lp-fg)]">
            <LogoMark className="brand-logo h-7 w-7" /> {APP_NAME}
          </p>
          <ul className="flex flex-wrap gap-6">
            <li><Link href="/login" className="hover:text-[var(--lp-fg)]">Sign in</Link></li>
            <li><Link href="/verify" className="hover:text-[var(--lp-fg)]">Verify a result</Link></li>
            <li><a href="#platform" className="hover:text-[var(--lp-fg)]">Platform</a></li>
          </ul>
          <p className="text-[var(--lp-fg-3)]">Technoverse 5.0 Web-e-Thon · 2026</p>
        </div>
      </footer>
    </section>
  )
}
