'use client'

import { motion } from 'motion/react'
import { useState } from 'react'

type Tab = { id: string; label: string; count?: number; content: React.ReactNode }

/** Shows one group of information at a time, so a busy page stays calm. */
export function SectionTabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].id)
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    const next = tabs[(tabs.indexOf(current) + step + tabs.length) % tabs.length]
    setActive(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === current.id}
            aria-controls="tab-panel"
            tabIndex={tab.id === current.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            className="relative whitespace-nowrap px-4 py-3.5 text-sm font-medium text-[color:var(--muted)] aria-selected:text-[color:var(--foreground)]"
          >
            {tab.label}
            {Boolean(tab.count) && <span className="segmented-count ml-2">{tab.count}</span>}
            {tab.id === current.id && <motion.span layoutId={`${label}-line`} className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--foreground)] dark:bg-[var(--highlight)]" />}
          </button>
        ))}
      </div>
      <motion.div
        key={current.id}
        id="tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${current.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        className="space-y-8 pt-8"
      >
        {current.content}
      </motion.div>
    </div>
  )
}
