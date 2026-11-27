'use client'

/**
 * The template's hero: a sticky tinted backdrop whose white veil draws back as you scroll, a headline
 * that blurs in and out, a product window cycling through real screens, and cards that appear around it.
 */
import { BadgeCheck, ChevronRight, Megaphone, ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion, useInView, useScroll, useTransform } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { hero, scenes } from '@/content/landing'
import { EASE_EMPHASIZED, EASE_OUT, ProductWindow, Shot } from './motion'

const SCENE_MS = 5200

const intro = (i: number) => ({
  initial: { opacity: 0, filter: 'blur(8px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  transition: { duration: 0.6, delay: 0.05 + i * 0.09, ease: EASE_OUT },
})

export function Hero() {
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()
  const veilX = useTransform(scrollY, [60, 520], [1, 0.57])
  const veilY = useTransform(scrollY, [60, 520], [1, 0.72])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section id="top" className="relative grid grid-cols-1 grid-rows-1 border-b border-[var(--lp-line)]">
      <div className="pointer-events-none sticky top-[var(--lp-head)] col-start-1 row-start-1 h-[calc(100svh-var(--lp-head))] self-start overflow-hidden" aria-hidden="true">
        <div className="lp-sky absolute inset-0" />
        <div className="lp-sky-lines absolute inset-0" />
        <motion.div
          className="absolute left-[-150%] top-0 h-[150%] w-[400%] origin-top will-change-transform"
          style={{ backgroundImage: 'radial-gradient(70% 106% at 50% 0%, var(--lp-bg) 32%, transparent 64%)', scaleX: veilX, scaleY: veilY }}
        />
      </div>

      <div className="z-10 col-start-1 row-start-1 flex min-w-0 flex-col items-center">
        <div className="flex flex-col items-center gap-7 px-6 pt-[max(56px,9svh)] text-center">
          <motion.div {...intro(0)}>
            <Link href="/verify" className="relative block rounded-[13px] border border-[var(--lp-line)]">
              <span aria-hidden="true" className="absolute -inset-px overflow-hidden rounded-[13px]"><span className="lp-beam absolute inset-0" /></span>
              <span className="relative flex items-center gap-1 rounded-[12px] bg-[var(--lp-bg)] py-1.5 pl-3 pr-2 text-[13px] font-medium">
                {hero.pill}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          </motion.div>
          <motion.h1 {...intro(1)} className="lp-display max-w-[13em] text-balance font-semibold leading-[0.98] tracking-[-0.032em]" style={{ fontSize: 'clamp(2.75rem, 1rem + 5vw, 5.25rem)' }}>
            {hero.title}
          </motion.h1>
          <motion.p {...intro(2)} className="max-w-[34em] text-balance text-lg font-medium leading-relaxed text-[var(--lp-fg-2)]">{hero.subtitle}</motion.p>
          <motion.div {...intro(3)} className="flex flex-wrap justify-center gap-3">
            <Link href="/verify" className="lp-btn lp-btn-outline">Verify a result</Link>
            <Link href="/login" className="lp-btn lp-btn-primary">Sign in</Link>
          </motion.div>
        </div>

        <div className="relative mt-16 w-[min(1120px,88%)] pb-24">
          <motion.div initial={{ opacity: 0, y: 56 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.35, ease: EASE_EMPHASIZED }}>
            <motion.div animate={{ scale: scrolled ? 0.97 : 1 }} transition={{ duration: 0.6, ease: EASE_EMPHASIZED }}>
              <SceneLoop />
            </motion.div>
          </motion.div>
          <Floating show={scrolled} />
        </div>
      </div>
    </section>
  )
}

function SceneLoop() {
  const box = useRef<HTMLDivElement>(null)
  const inView = useInView(box, { amount: 0.15 })
  const [index, setIndex] = useState(0)
  const scene = scenes[index]

  useEffect(() => {
    if (!inView || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % scenes.length), SCENE_MS)
    return () => window.clearTimeout(timer)
  }, [index, inView])

  return (
    <div ref={box}>
      <ProductWindow>
        <div className="relative aspect-[16/10] overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div key={scene.id} className="absolute inset-0" initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
              <Shot name={scene.id} alt={`${scene.label} screen`} fill className="lp-pan object-cover object-top" />
            </motion.div>
          </AnimatePresence>
        </div>
      </ProductWindow>
      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Choose a screen">
        {scenes.map((item, i) => (
          <button key={item.id} type="button" aria-pressed={i === index} onClick={() => setIndex(i)} className="relative overflow-hidden rounded-full border border-[var(--lp-line)] bg-[var(--lp-bg)] px-4 py-2 text-[13px] font-medium text-[var(--lp-fg-2)] aria-pressed:text-[var(--lp-fg)]">
            {i === index && <span key={`${index}`} className="lp-fill absolute inset-0 bg-[#e8f0ff] dark:bg-[#2b3f78]" style={{ animationDuration: `${SCENE_MS}ms` }} aria-hidden="true" />}
            <span className="relative">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Three small windows that blur in around the product once the page is scrolled (wide screens). */
function Floating({ show }: { show: boolean }) {
  const layer = (delay: number) => ({
    initial: false,
    animate: { opacity: show ? 1 : 0, filter: show ? 'blur(0px)' : 'blur(6px)', y: show ? 0 : 24 },
    transition: { duration: 0.5, delay: show ? delay : 0, ease: EASE_OUT },
  })
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 max-xl:hidden">
      <motion.div {...layer(0.05)} className="absolute -left-24 top-6 w-72">
        <ProductWindow>
          <p className="flex items-center gap-2 px-4 pt-3 text-xs font-semibold"><Megaphone className="h-3.5 w-3.5" /> Announcement</p>
          <p className="px-4 pb-4 pt-2 text-[13px] leading-5 text-[var(--lp-fg-2)]">Question 4: read “primary key” as “candidate key”. Your time is unchanged.</p>
        </ProductWindow>
      </motion.div>
      <motion.div {...layer(0.12)} className="absolute -right-24 top-24 w-64">
        <ProductWindow>
          <div className="p-4 text-center">
            <BadgeCheck className="mx-auto h-9 w-9 text-[#0db472]" />
            <p className="mt-2 text-sm font-semibold">Result is valid</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--lp-fg-3)]">signed report · code and QR</p>
          </div>
        </ProductWindow>
      </motion.div>
      <motion.div {...layer(0.2)} className="absolute -left-16 bottom-40 w-80">
        <ProductWindow dark>
          <div className="space-y-1.5 p-4 font-mono text-[11px] leading-4">
            <p className="flex items-center gap-2 text-[#e4f222]"><ShieldCheck className="h-3.5 w-3.5" /> audit chain check</p>
            <p>exam.published &nbsp;sealed</p>
            <p>attempt.submitted &nbsp;sealed</p>
            <p>result.published &nbsp;sealed</p>
            <p className="text-[#0fc27b]">✓ no entry altered</p>
          </div>
        </ProductWindow>
      </motion.div>
    </div>
  )
}
