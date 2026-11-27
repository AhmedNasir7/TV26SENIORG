'use client'

/** The attempt record that fills itself in, the dark monitoring field, and the drawn curve. */
import { Check, Clock, FileCheck2, Radio, Save } from 'lucide-react'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import { events, stats } from '@/content/landing'
import { BlurIn, EASE_OUT, Streaks } from './motion'

const facts = [
  { icon: Clock, label: 'Started', value: 'Server time, fixed deadline' },
  { icon: Save, label: 'Answers', value: 'Saved with a revision number' },
  { icon: Radio, label: 'Indicators', value: 'Timed, grouped, reviewed' },
  { icon: FileCheck2, label: 'Receipt', value: 'Hash of what was submitted' },
]

export function Records() {
  return (
    <section id="records" className="border-b border-[var(--lp-line)] bg-[var(--lp-bg)]">
      <div className="lp-frame">
        <div className="lp-rails">
          <BlurIn className="flex flex-col items-center px-6 pt-28 text-center">
            <p className="lp-eyebrow">Records</p>
            <h2 className="lp-h2 mt-6 max-w-3xl">Every attempt builds its own record. <span className="lp-muted">Nobody has to take your word for it.</span></h2>
          </BlurIn>
          <div className="relative mt-4 h-24 overflow-hidden text-[var(--lp-line)] [mask-image:linear-gradient(to_bottom,transparent,#000)]" aria-hidden="true">
            <div className="lp-stripes absolute inset-0" />
            <Streaks count={6} width={1} color="#8f99a8" opacity={0.8} />
          </div>
          <div className="border-t border-[var(--lp-line)] px-4 py-14 lg:px-24">
            <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {facts.map(({ icon: Icon, label, value }, i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: i * 0.14, ease: EASE_OUT }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-[var(--lp-line)] p-6 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.08)]"
                >
                  <p className="flex items-center justify-between text-[13px] font-medium text-[var(--lp-fg-3)]">
                    {label}
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </p>
                  <p className="mt-6 text-lg font-semibold">{value}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Monitoring() {
  return (
    <section id="monitoring" data-header-dark className="lp-dark relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 text-white/[0.035] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_25%,#000_80%)]">
        <div className="lp-stripes absolute inset-0" />
        <Streaks count={14} color="rgb(138,147,161)" opacity={0.45} />
      </div>
      <div className="lp-frame relative grid items-center gap-14 py-28 lg:grid-cols-2">
        <BlurIn>
          <p className="lp-eyebrow">Monitoring</p>
          <h2 className="lp-h2 mt-6">Reasons to look. <span className="lp-muted">Never a verdict.</span></h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--lp-fg-2)]">
            Records are shown in order with their durations. An examiner writes the note; an AI review, when asked for, also lists innocent explanations.
          </p>
        </BlurIn>
        <ol className="space-y-3">
          {events.map((event, i) => (
            <motion.li
              key={event.what}
              initial={{ opacity: 0, x: 60, filter: 'blur(6px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, delay: i * 0.22, ease: EASE_OUT }}
              className="flex items-center gap-4 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-bg-2)] px-6 py-5"
            >
              <span className="font-mono text-sm text-[var(--lp-fg-3)]">{event.at}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{event.what}</span>
                <span className="block text-sm text-[var(--lp-fg-3)]">{event.detail}</span>
              </span>
              {i === events.length - 1 ? <Check className="h-5 w-5 text-[#0fc27b]" aria-hidden="true" /> : <span className="lp-radar h-2.5 w-2.5 rounded-full bg-[#e4f222]" aria-hidden="true" />}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const CURVE = Array.from({ length: 61 }, (_, i) => {
  const t = i / 60
  return `${(1392 * t).toFixed(0)} ${(380 * (1 - Math.pow(t, 2.4)) + 10).toFixed(1)}`
}).join(' L ')

export function Numbers() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.35 })
  return (
    <section className="border-b border-[var(--lp-line)] bg-[var(--lp-bg)]">
      <div ref={ref} className="lp-frame">
        <div className="lp-rails relative overflow-hidden">
          <motion.svg
            className="absolute inset-x-0 bottom-0 h-2/3 w-full"
            preserveAspectRatio="none"
            viewBox="0 0 1392 400"
            aria-hidden="true"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={seen ? { clipPath: 'inset(0 0% 0 0)' } : undefined}
            transition={{ duration: 1.4, delay: 0.1, ease: [0, 0, 0.58, 1] }}
          >
            <path d={`M ${CURVE} L 1392 400 L 0 400 Z`} fill="rgb(148 185 255 / 0.14)" />
            <path d={`M ${CURVE}`} fill="none" stroke="#266df0" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </motion.svg>
          <div className="relative px-6 py-28 lg:px-16">
            <p className="lp-eyebrow">By design</p>
            <h2 className="lp-h2 mt-6 max-w-xl">Rules the server enforces. <span className="lp-muted">Not promises on a slide.</span></h2>
            <dl className="mt-24 grid max-w-2xl gap-x-12 gap-y-10 sm:grid-cols-2">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, filter: 'blur(3px)' }}
                  animate={seen ? { opacity: 1, filter: 'blur(0px)' } : undefined}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.12 }}
                  className="border-l-2 border-[#266df0] bg-[color-mix(in_srgb,var(--lp-bg)_75%,transparent)] pl-5"
                >
                  <dd className="text-4xl font-semibold tabular-nums tracking-tight">{stat.value}</dd>
                  <dt className="mt-1 text-[15px] font-medium text-[var(--lp-fg-2)]">{stat.label}</dt>
                </motion.div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
