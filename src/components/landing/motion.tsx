'use client'

/** Shared motion pieces of the landing page, after the template's blur-in and rising light streaks. */
import { motion } from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { shot } from '@/content/landing'

export const EASE_OUT = [0.33, 1, 0.68, 1] as const
export const EASE_EMPHASIZED = [0.2, 0, 0, 1] as const

export function BlurIn({ children, className, delay = 0, y = 16 }: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: 'blur(3px)', y }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  )
}

/** Thin light bars travelling upwards. Runs only while on screen. */
export function Streaks({ count = 8, color = 'rgba(255,255,255,0.5)', width = 2, opacity = 0.4 }: { count?: number; color?: string; width?: number; opacity?: number }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const bars = Array.from(el.children) as HTMLDivElement[]
    const random = (a: number, b: number) => a + Math.random() * (b - a)
    const spawn = (first: boolean) => ({
      x: Math.round(random(0, el.clientWidth) / 8) * 8,
      y: first ? random(-200, el.clientHeight) : el.clientHeight + random(0, el.clientHeight * 0.6),
      speed: random(150, 240),
      size: random(0.35, 0.95),
      alpha: random(opacity * 0.5, opacity),
    })
    const state = bars.map(() => spawn(true))
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      state.forEach((s, i) => {
        s.y -= s.speed * dt
        const length = 360 * s.size
        if (s.y < -length) Object.assign(s, spawn(false))
        const progress = 1 - (s.y + length) / (el.clientHeight + length)
        bars[i].style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scaleY(${s.size})`
        bars[i].style.opacity = String(Math.max(0, Math.min(1, progress / 0.2, (1 - progress) / 0.2)) * s.alpha)
      })
      frame = requestAnimationFrame(tick)
    }
    const seen = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame)
      last = 0
      if (entry.isIntersecting) frame = requestAnimationFrame(tick)
    })
    seen.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      seen.disconnect()
    }
  }, [opacity])

  return (
    <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="absolute left-0 top-0 h-[360px] origin-top opacity-0" style={{ width, background: `linear-gradient(to bottom, transparent, ${color} 50%, transparent)` }} />
      ))}
    </div>
  )
}

/** The window frame around product pictures. */
export function ProductWindow({ children, dark, className = '' }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={`lp-window ${dark ? 'lp-window-dark' : ''} ${className}`}>
      <div className="lp-window-bar" aria-hidden="true"><i /><i /><i /></div>
      <div className="lp-window-body">{children}</div>
    </div>
  )
}

type ShotProps = { name: string; alt: string; className?: string; fill?: boolean }

/** A product picture that matches the theme; the hidden one is never downloaded. */
export function Shot({ name, alt, className = '', fill }: ShotProps) {
  const size = fill ? { fill: true } : { width: 1800, height: 1125 }
  return (
    <>
      <Image src={shot(name, 'light')} alt={alt} {...size} unoptimized className={`${className} dark:hidden`} />
      <Image src={shot(name, 'dark')} alt={alt} {...size} unoptimized className={`${className} hidden dark:block`} />
    </>
  )
}

