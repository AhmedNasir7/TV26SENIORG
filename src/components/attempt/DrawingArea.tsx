'use client'

import { useState } from 'react'
import { MAX_POINTS } from '@/lib/validation/workspace'
import type { Pad } from './storage'

type Stroke = Pad['drawing'][number]
type Props = { drawing: Stroke[]; disabled: boolean; onChange: (drawing: Stroke[]) => void }

const MAX_STROKES = 300
const clamp = (value: number) => Math.round(Math.min(1000, Math.max(0, value)))
const toPoints = (stroke: Stroke) => stroke.map(([x, y]) => `${x},${y}`).join(' ')

/** Freehand sketching stored as small integer points. Typed notes remain the keyboard alternative. */
export function DrawingArea({ drawing, disabled, onChange }: Props) {
  const [current, setCurrent] = useState<Stroke | null>(null)
  const used = drawing.reduce((sum, stroke) => sum + stroke.length, 0)
  const full = used >= MAX_POINTS || drawing.length >= MAX_STROKES

  function point(event: React.PointerEvent<SVGSVGElement>): [number, number] {
    const box = event.currentTarget.getBoundingClientRect()
    return [clamp(((event.clientX - box.left) / box.width) * 1000), clamp(((event.clientY - box.top) / box.height) * 1000)]
  }

  function finish() {
    if (current) onChange([...drawing, current])
    setCurrent(null)
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Drawing area with ${drawing.length} lines`}
        className="min-h-72 w-full flex-1 touch-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]"
        onPointerDown={(e) => {
          if (disabled || full) return
          e.currentTarget.setPointerCapture(e.pointerId)
          setCurrent([point(e)])
        }}
        onPointerMove={(e) => {
          if (!current || current.length >= 1000 || used + current.length >= MAX_POINTS) return
          const next = point(e)
          const last = current[current.length - 1]
          // Skip points too close to matter
          if (Math.hypot(next[0] - last[0], next[1] - last[1]) >= 6) setCurrent([...current, next])
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {[...drawing, ...(current ? [current] : [])].map((stroke, index) => (
          <polyline key={index} points={toPoints(stroke)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={disabled || !drawing.length} onClick={() => onChange(drawing.slice(0, -1))} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Undo line</button>
        <button type="button" disabled={disabled || !drawing.length} onClick={() => onChange([])} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Clear drawing</button>
        {full && <span className="text-[color:var(--muted)]">The drawing area is full.</span>}
      </div>
    </div>
  )
}
