import type { ConnectionState } from '@/lib/connection'
import type { SaveState } from './saveQueue'

const WARNINGS = [600, 300, 60, 30]
const CONNECTION = { online: 'Connected', unstable: 'Unstable', offline: 'Offline', reconnecting: 'Reconnecting' } as const

function clock(ms: number) {
  const total = Math.ceil(ms / 1000)
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':')
}

function saveText(save: SaveState) {
  if (save.kind === 'saving') return 'Saving...'
  if (save.kind === 'retrying') return `Not saved yet: ${save.unsaved} waiting. Retrying.`
  if (save.kind === 'blocked') return `Not saved: ${save.message}`
  return save.at ? `All answers saved at ${new Date(save.at).toLocaleTimeString()}` : 'All answers saved'
}

type Props = { title: string; remaining: number; save: SaveState; connection: ConnectionState; compact: boolean }

export function TimerBar({ title, remaining, save, connection, compact }: Props) {
  const seconds = Math.ceil(remaining / 1000)
  // Announced to screen readers only when a threshold is crossed, not every second
  const warning = [...WARNINGS].reverse().find((limit) => seconds <= limit)

  return (
    <div className={`surface-card sticky top-3 z-10 ${compact ? 'px-4 py-2' : 'p-4'} backdrop-blur-md [background:color-mix(in_srgb,var(--surface)_92%,transparent)]`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={compact ? 'sr-only' : 'font-display text-lg font-semibold'}>{title}</h1>
        <p className="text-sm">
          Time left{' '}
          <span role="timer" className={`stat-figure ${compact ? 'text-base' : 'text-xl'} font-semibold tabular-nums ${seconds <= 60 ? 'timer-critical' : seconds <= 300 ? 'timer-low' : ''}`}>
            {clock(remaining)}
          </span>
        </p>
      </div>
      <p role="status" className="mt-1 text-xs" style={{ color: save.kind === 'retrying' || save.kind === 'blocked' ? 'var(--danger)' : 'var(--muted)' }}>
        {saveText(save)}
      </p>
      <span className={`chip mt-1 ${connection === 'online' ? 'chip-success' : 'chip-warning'}`}>{CONNECTION[connection]}</span>
      <p aria-live="assertive" className="sr-only">
        {warning ? `Less than ${warning >= 60 ? `${warning / 60} minutes` : `${warning} seconds`} left` : ''}
      </p>
    </div>
  )
}
