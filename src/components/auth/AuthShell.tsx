'use client'

/**
 * Frame of the sign-in and sign-up pages, in the landing page's style: a blur-in headline and form on
 * one side, the product cycling over a tinted backdrop with rising light on the other.
 */
import { BadgeCheck, Clock3, Save } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { EASE_OUT, ProductWindow, Shot, Streaks } from '@/components/landing/motion'
import '@/components/landing/landing.css'
import { BrandMark } from '@/components/layout/BrandMark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { scenes } from '@/content/landing'

const chips = [
  { icon: Clock3, text: 'The server keeps the clock', place: 'left-0 top-[8%]' },
  { icon: Save, text: 'Answers save as you type', place: 'right-0 top-[46%]' },
  { icon: BadgeCheck, text: 'Results can be verified', place: 'left-[6%] bottom-[2%]' },
]

const rise = (i: number) => ({
  initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, delay: 0.05 + i * 0.09, ease: EASE_OUT },
})

export function AuthShell({ title, accent, subtitle, children }: { title: string; accent: string; subtitle: string; children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="page-shell grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex min-w-0 flex-col px-6 sm:px-12 xl:px-24">
          <header className="flex h-20 items-center justify-between">
            <BrandMark />
            <div className="flex items-center gap-3">
              <Link href="/" className="btn-ghost px-3 py-2 text-sm">Home</Link>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
            <motion.h1 {...rise(0)} className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.03em]">
              {title} <span className="mark-highlight">{accent}</span>
            </motion.h1>
            <motion.p {...rise(1)} className="mt-4 text-[15px] leading-6 text-[color:var(--muted)]">{subtitle}</motion.p>
            <motion.div {...rise(2)} className="mt-10">{children}</motion.div>
          </main>
        </div>
        <Showcase />
      </div>
    </MotionConfig>
  )
}

function Showcase() {
  const [index, setIndex] = useState(0)
  const scene = scenes[index]

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % scenes.length), 5000)
    return () => window.clearTimeout(timer)
  }, [index])

  return (
    <aside aria-hidden="true" className="relative m-4 hidden overflow-hidden rounded-[28px] border border-[var(--border)] lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(110%_90%_at_50%_100%,#86a0ee_0%,#bccbff_42%,#eef2ff_100%)] dark:bg-[radial-gradient(110%_90%_at_50%_100%,#2a3a6e_0%,#16203d_45%,#101010_100%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.55)_0_1px,transparent_1px_8px)] dark:bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.04)_0_1px,transparent_1px_8px)]" />
      <Streaks count={14} color="rgba(255,255,255,0.95)" opacity={0.7} />
      <div className="lp absolute inset-0 flex items-center justify-center !bg-transparent px-10">
        <div className="relative w-full max-w-3xl py-16">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>
            <ProductWindow>
              <div className="relative aspect-[16/10] overflow-hidden">
                <AnimatePresence initial={false}>
                  <motion.div key={scene.id} className="absolute inset-0" initial={{ opacity: 0, filter: 'blur(8px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
                    <Shot name={scene.id} alt="" fill className="lp-pan object-cover object-top" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </ProductWindow>
          </motion.div>
          {chips.map(({ icon: Icon, text, place }, i) => (
            <motion.p
              key={text}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: [0, 9, 0] }}
              transition={{ default: { duration: 0.6, delay: 0.7 + i * 0.25, ease: EASE_OUT }, y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut' } }}
              className={`absolute ${place} flex items-center gap-2.5 rounded-2xl border border-black/5 bg-white/90 px-4 py-3 text-sm font-semibold text-[#1c1d1f] shadow-[0_16px_32px_-12px_rgb(0_0_0/0.35)] backdrop-blur`}
            >
              <Icon className="h-4 w-4 text-[#266df0]" />
              {text}
            </motion.p>
          ))}
        </div>
      </div>
    </aside>
  )
}
