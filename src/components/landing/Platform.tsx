'use client'

/** Feature walk-through with the template's scroll-spy rail, plus its rotating wall of capabilities. */
import {
  CalendarDays, Clock, FileCheck2, Mail, Mic, Radio, Save, Scale, Sparkles, Video, type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { articles } from '@/content/landing'
import { BlurIn, EASE_OUT, ProductWindow, Shot } from './motion'

const wall: Array<[LucideIcon, string]> = [
  [Clock, 'Server clock'], [Save, 'Autosave'], [Radio, 'Live monitor'], [Scale, 'Fair papers'], [FileCheck2, 'Signed PDF'],
  [Sparkles, 'AI review'], [Mic, 'Voice'], [Mail, 'Reminders'], [CalendarDays, 'Google Calendar'], [Video, 'Video help'],
]

export function CapabilityWall() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setStep((v) => v + 1), 2600)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section aria-label="What is built in" className="border-b border-[var(--lp-line)] bg-[var(--lp-bg-2)]">
      <ul className="lp-frame grid grid-cols-2 gap-px bg-[var(--lp-line)] !px-0 md:grid-cols-5">
        {wall.map(([Icon, label], i) => {
          // One tile at a time swaps in with a blur, travelling across the wall
          const lit = step % wall.length === i
          return (
            <li key={label} className="relative flex h-28 items-center justify-center overflow-hidden bg-[var(--lp-bg-2)]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={lit ? 'lit' : 'rest'}
                  initial={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
                  transition={{ duration: 0.5 }}
                  className={`flex items-center gap-2.5 text-[15px] font-semibold ${lit ? 'text-[var(--lp-blue)]' : 'text-[var(--lp-fg-2)]'}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </motion.span>
              </AnimatePresence>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function Platform() {
  const [active, setActive] = useState(0)
  const items = useRef<Array<HTMLElement | null>>([])

  useEffect(() => {
    const check = () => {
      const line = window.innerHeight * 0.45
      let index = 0
      items.current.forEach((node, i) => {
        if (node && node.getBoundingClientRect().top <= line) index = i
      })
      setActive(index)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [])

  return (
    <section id="platform" className="bg-[var(--lp-bg-2)]">
      <div className="lp-frame">
        <div className="lp-rails">
          <BlurIn className="border-b border-[var(--lp-line)] px-6 pb-20 pt-28 lg:px-16">
            <p className="lp-eyebrow">Platform</p>
            <h2 className="lp-h2 mt-6 max-w-3xl">
              One flow from question to certificate.<br /><span className="lp-muted">Each step knows the next one.</span>
            </h2>
          </BlurIn>
          <div className="lg:grid lg:grid-cols-[16rem_1fr]">
            <nav aria-label="Platform features" className="sticky top-[var(--lp-head)] z-20 hidden self-start border-r border-[var(--lp-line)] py-24 lg:block">
              <ol className="space-y-3">
                {articles.map((article, i) => (
                  <li key={article.id} className="relative">
                    {i === active && <motion.span layoutId="lp-rail" className="absolute inset-y-0 left-0 w-0.5 bg-[#709ff5]" transition={{ duration: 0.35, ease: EASE_OUT }} />}
                    <a href={`#${article.id}`} className={`block px-8 py-1 text-lg font-medium transition-colors duration-300 ${i === active ? 'text-[var(--lp-fg)]' : 'text-[var(--lp-line-2)] hover:text-[var(--lp-fg-2)]'}`}>
                      {article.tab}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0">
              {articles.map((article, i) => (
                <article key={article.id} id={article.id} ref={(node) => { items.current[i] = node }} className="border-b border-[var(--lp-line)] px-4 py-20 last:border-b-0 lg:px-16 lg:py-24">
                  <BlurIn>
                    <h3 className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight">
                      {article.title} <span className="lp-muted">{article.muted}</span>
                    </h3>
                  </BlurIn>
                  <motion.div
                    className="mt-10 [transform-origin:50%_100%]"
                    initial={{ opacity: 0, y: 64, rotateX: 14, scale: 0.94 }}
                    whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.9, ease: EASE_OUT }}
                    style={{ transformPerspective: 1400 }}
                  >
                    <ProductWindow>
                      <Shot name={article.image} alt={`${article.tab} screen`} className="h-auto w-full" />
                    </ProductWindow>
                  </motion.div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
