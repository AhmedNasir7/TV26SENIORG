'use client'

/**
 * Rough work, one press away: a six-sided button on the right edge opens a typing and drawing pad
 * over half the screen, and the examination moves into the other half.
 */
import { NotebookPen, PenLine, Type, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { DictateButton } from '@/components/audio/DictateButton'
import { MAX_NOTES } from '@/lib/validation/workspace'
import { Calculator } from './Calculator'
import { DrawingArea } from './DrawingArea'
import { useScratchpad } from './useScratchpad'

type Props = { attemptId: number; sessionId: string; readOnly: boolean }

export function ScratchDock(props: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // The stylesheet narrows the page while the pad is open
    document.documentElement.dataset.pad = open ? 'open' : 'closed'
    return () => {
      delete document.documentElement.dataset.pad
    }
  }, [open])

  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open scratchpad"
            title="Scratchpad"
            className="pad-hex"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 6 }}
            whileTap={{ scale: 0.94 }}
          >
            <NotebookPen className="h-6 w-6" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.aside
            data-scratchpad
            aria-label="Scratchpad"
            className="pad-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
          >
            <Pad {...props} onClose={() => setOpen(false)} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function Pad({ attemptId, sessionId, readOnly, onClose }: Props & { onClose: () => void }) {
  const { pad, change, status } = useScratchpad(attemptId, sessionId, !readOnly)
  const [tab, setTab] = useState<'type' | 'draw'>('type')

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="segmented" role="group" aria-label="Pad mode">
          <button type="button" aria-current={tab === 'type' ? 'page' : undefined} onClick={() => setTab('type')} className="segmented-item">
            <Type className="h-4 w-4" aria-hidden="true" /> Type
          </button>
          <button type="button" aria-current={tab === 'draw' ? 'page' : undefined} onClick={() => setTab('draw')} className="segmented-item">
            <PenLine className="h-4 w-4" aria-hidden="true" /> Draw
          </button>
        </div>
        <button type="button" onClick={onClose} aria-label="Close scratchpad" className="btn-secondary p-2">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-sm text-[color:var(--muted)]">Private rough work. Never graded.</p>
      {!pad ? (
        <p className="text-sm text-[color:var(--muted)]">Loading...</p>
      ) : tab === 'type' ? (
        <textarea
          aria-label="Rough notes"
          autoFocus
          maxLength={MAX_NOTES}
          readOnly={readOnly}
          value={pad.notes}
          placeholder="Type here..."
          onChange={(e) => change({ notes: e.target.value })}
          className="input-clean min-h-72 w-full flex-1 resize-none p-5 font-mono text-[15px] leading-7"
        />
      ) : (
        <div className="min-h-0 flex-1">
          <DrawingArea drawing={pad.drawing} disabled={readOnly} onChange={(drawing) => change({ drawing })} />
        </div>
      )}
      <Calculator />
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-xs text-[color:var(--muted)]">{status}</p>
        {tab === 'type' && pad && !readOnly && (
          <DictateButton onText={(text) => change({ notes: `${pad.notes}${pad.notes ? ' ' : ''}${text}`.slice(0, MAX_NOTES) })} />
        )}
      </div>
    </div>
  )
}
