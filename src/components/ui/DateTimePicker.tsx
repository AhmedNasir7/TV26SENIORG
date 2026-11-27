'use client'

/**
 * A date and time picker in the product's own look, with no extra library: a month grid with today
 * ringed, a time column set (hour, minute, AM/PM), and quick buttons for "Now" and "Today".
 * Values are plain local strings, exactly what a native input gives: "2026-11-27T14:30" or "2026-11-27".
 */
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useMemo, useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  /** "date" hides the time columns and gives "YYYY-MM-DD" */
  mode?: 'datetime' | 'date'
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  /** earliest value allowed, same format as value */
  min?: string
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toValue = (d: Date, mode: 'datetime' | 'date') => (mode === 'date' ? dayKey(d) : `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`)

function parse(value: string): Date | null {
  if (!value) return null
  const [datePart, timePart = '00:00'] = value.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1, hh || 0, mm || 0)
  return Number.isNaN(date.getTime()) ? null : date
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const SHOWN = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const SHOWN_TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** The 42 cells of a month view, starting on Monday. */
function cells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i))
}

export function DateTimePicker({ value, onChange, mode = 'datetime', label, placeholder, required, disabled, min, className = '' }: Props) {
  const selected = useMemo(() => parse(value), [value])
  const floor = useMemo(() => (min ? parse(min) : null), [min])
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date((selected ?? new Date()).getFullYear(), (selected ?? new Date()).getMonth(), 1))
  const today = new Date()
  const withTime = mode === 'datetime'

  // The time being edited: the chosen one, or the next half hour when nothing is chosen yet
  const base = selected ?? (() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0)
    return d
  })()
  const hour12 = base.getHours() % 12 || 12
  const pm = base.getHours() >= 12

  const commit = (d: Date) => onChange(toValue(d, mode))
  const pickDay = (day: Date) => {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate(), base.getHours(), base.getMinutes())
    commit(next)
    if (!withTime) setOpen(false)
  }
  const setTime = (patch: { hour?: number; minute?: number; pm?: boolean }) => {
    const h12 = patch.hour ?? hour12
    const isPm = patch.pm ?? pm
    const hours = (h12 % 12) + (isPm ? 12 : 0)
    commit(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, patch.minute ?? base.getMinutes()))
  }
  const now = () => {
    const d = new Date()
    commit(d)
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }
  const todayOnly = () => {
    commit(new Date(today.getFullYear(), today.getMonth(), today.getDate(), base.getHours(), base.getMinutes()))
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }
  const shift = (by: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + by, 1))
  const tooEarly = (day: Date) => floor !== null && dayKey(day) < dayKey(floor)

  const shown = selected ? (withTime ? `${SHOWN.format(selected)} · ${SHOWN_TIME.format(selected)}` : SHOWN.format(selected)) : ''
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)
  if (selected && !minutes.includes(selected.getMinutes())) minutes.push(selected.getMinutes()), minutes.sort((a, b) => a - b)

  const column = 'max-h-32 overflow-y-auto pr-1 sm:max-h-60'
  const timeBtn = (active: boolean) =>
    `block w-full rounded-lg px-3 py-1.5 text-center text-sm tabular-nums transition-colors ${active ? 'bg-[var(--lime,#e4f222)] font-semibold text-[#17181c]' : 'hover:bg-[var(--surface-muted)]'}`

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          const anchor = selected ?? new Date()
          setMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
        }
      }}
    >
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={label}
          className={`input-clean flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-normal disabled:opacity-60 ${className}`}
        >
          <span className={shown ? '' : 'text-[color:var(--muted)]'}>{shown || placeholder || (withTime ? 'Pick date and time' : 'Pick a date')}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[color:var(--muted)]" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      {/* A hidden input keeps native form validation for required fields */}
      {required && <input tabIndex={-1} aria-hidden="true" required value={value} onChange={() => {}} className="pointer-events-none absolute h-0 w-0 opacity-0" />}
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          side="bottom"
          avoidCollisions
          sticky="always"
          className="surface-card z-[95] w-[min(38rem,calc(100vw-1.5rem))] max-h-[min(var(--radix-popover-content-available-height),36rem)] overflow-y-auto p-4 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className={withTime ? 'sm:grid sm:grid-cols-[minmax(0,1fr)_12.5rem] sm:gap-5' : ''}>
          <div>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="btn-ghost grid h-8 w-8 place-items-center">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="font-display text-sm font-semibold" aria-live="polite">{MONTH.format(month)}</p>
            <button type="button" onClick={() => shift(1)} aria-label="Next month" className="btn-ghost grid h-8 w-8 place-items-center">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[color:var(--muted)]">
            {WEEKDAYS.map((d) => <span key={d} className="py-1">{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells(month).map((day) => {
              const inMonth = day.getMonth() === month.getMonth()
              const isToday = dayKey(day) === dayKey(today)
              const isSelected = selected !== null && dayKey(day) === dayKey(selected)
              const blocked = tooEarly(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={blocked}
                  onClick={() => pickDay(day)}
                  aria-label={SHOWN.format(day)}
                  aria-pressed={isSelected}
                  className={[
                    'grid h-8 place-items-center rounded-lg text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                    isSelected ? 'bg-[var(--lime,#e4f222)] font-semibold text-[#17181c]' : inMonth ? 'hover:bg-[var(--surface-muted)]' : 'text-[color:var(--muted)] opacity-50 hover:bg-[var(--surface-muted)]',
                    isToday && !isSelected ? 'ring-1 ring-inset ring-[var(--foreground)] font-semibold' : '',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
          </div>

          {withTime && (
            <div className="mt-3 border-t border-[var(--border)] pt-3 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-[color:var(--muted)]">
                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Time
              </p>
              <div className="grid grid-cols-[1fr_1fr_3.25rem] gap-2">
                <div className={column} role="listbox" aria-label="Hour">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <button key={h} type="button" onClick={() => setTime({ hour: h })} className={timeBtn(selected !== null && h === hour12)}>{pad(h)}</button>
                  ))}
                </div>
                <div className={column} role="listbox" aria-label="Minute">
                  {minutes.map((m) => (
                    <button key={m} type="button" onClick={() => setTime({ minute: m })} className={timeBtn(selected !== null && m === base.getMinutes())}>{pad(m)}</button>
                  ))}
                </div>
                <div className="space-y-1">
                  {(['AM', 'PM'] as const).map((half) => (
                    <button key={half} type="button" onClick={() => setTime({ pm: half === 'PM' })} className={timeBtn(selected !== null && (half === 'PM') === pm)}>{half}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <div className="flex gap-1.5">
              <button type="button" onClick={withTime ? now : todayOnly} className="btn-secondary px-3 py-1.5 text-xs">
                {withTime ? 'Now' : 'Today'}
              </button>
              {withTime && (
                <button type="button" onClick={todayOnly} className="btn-ghost px-3 py-1.5 text-xs">Today</button>
              )}
              {!required && selected && (
                <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="btn-ghost px-3 py-1.5 text-xs">Clear</button>
              )}
            </div>
            <button type="button" onClick={() => { if (!selected) commit(base); setOpen(false) }} className="btn-primary px-4 py-1.5 text-xs">Done</button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
