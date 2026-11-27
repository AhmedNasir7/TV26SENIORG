'use client'

import { MAX_NOTES } from '@/lib/validation/workspace'
import { DrawingArea } from './DrawingArea'
import { useScratchpad } from './useScratchpad'

type Props = { attemptId: number; sessionId: string; readOnly: boolean; onClose: () => void }

export function Scratchpad({ attemptId, sessionId, readOnly, onClose }: Props) {
  const { pad, change, status } = useScratchpad(attemptId, sessionId, !readOnly)

  return (
    <aside data-scratchpad aria-label="Scratchpad" className="surface-card space-y-3 p-4 text-sm lg:sticky lg:top-28">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold">Scratchpad</h2>
        <button type="button" onClick={onClose} className="btn-ghost px-2 py-1">Close</button>
      </div>
      <p className="text-[color:var(--muted)]">Rough work only. It is not graded and your examiner cannot see it.</p>
      {!pad ? (
        <p className="text-[color:var(--muted)]">Loading...</p>
      ) : (
        <>
          <textarea
            aria-label="Rough notes"
            rows={8}
            maxLength={MAX_NOTES}
            readOnly={readOnly}
            value={pad.notes}
            onChange={(e) => change({ notes: e.target.value })}
            className="input-clean w-full px-3 py-2 font-mono"
          />
          <DrawingArea drawing={pad.drawing} disabled={readOnly} onChange={(drawing) => change({ drawing })} />
        </>
      )}
      <p role="status" className="text-xs text-[color:var(--muted)]">{status}</p>
    </aside>
  )
}
