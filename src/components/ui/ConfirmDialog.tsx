'use client'

/**
 * One confirmation popup for the whole app, built like the command menu.
 *   const confirm = useConfirm()
 *   if (await confirm({ title: 'Publish?', body: '...', action: 'Publish' })) ...
 * With `reason`, the answer is the typed reason. Cancelling answers null.
 */
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { motion } from 'motion/react'
import { Dialog as Primitive } from 'radix-ui'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

type Options = { title: string; body?: string; action: string; danger?: boolean; reason?: { label: string; minLength: number } }
type Pending = Options & { resolve: (value: string | null) => void }

const ConfirmContext = createContext<((options: Options) => Promise<string | null>) | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)
  const ask = useCallback((options: Options) => new Promise<string | null>((resolve) => setPending({ ...options, resolve })), [])

  const close = (value: string | null) => {
    pending?.resolve(value)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && <Popup key={pending.title} options={pending} onClose={close} />}
    </ConfirmContext.Provider>
  )
}

function Popup({ options, onClose }: { options: Options; onClose: (value: string | null) => void }) {
  const [reason, setReason] = useState('')
  const cancel = useRef<HTMLButtonElement>(null)
  const blocked = Boolean(options.reason && reason.trim().length < options.reason.minLength)
  const Icon = options.danger ? AlertTriangle : HelpCircle

  return (
    // Radix traps focus, closes on Escape or an outside click, and restores focus afterwards
    <Primitive.Root open onOpenChange={(open) => !open && onClose(null)}>
      <Primitive.Portal>
        <Primitive.Overlay asChild>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        </Primitive.Overlay>
        <div className="pointer-events-none fixed inset-0 z-[91] grid place-items-center p-4">
          <Primitive.Content
            asChild
            aria-describedby={options.body ? 'confirm-body' : undefined}
            // A harmless button gets focus first; a reason box takes it when there is one
            onOpenAutoFocus={(event) => {
              if (!options.reason) {
                event.preventDefault()
                cancel.current?.focus()
              }
            }}
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
              onSubmit={(event) => {
                event.preventDefault()
                if (!blocked) onClose(options.reason ? reason.trim() : 'yes')
              }}
              className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] text-[color:var(--foreground)] shadow-[0_32px_80px_-16px_rgb(0_0_0/0.5)]"
            >
              <div className="px-8 pb-8 pt-9 text-center">
                <motion.span
                  initial={{ scale: 0.4, rotate: -60 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 }}
                  className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${options.danger ? 'chip-danger' : 'highlight-card rounded-2xl!'}`}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </motion.span>
                <Primitive.Title className="font-display mt-5 text-xl font-semibold">{options.title}</Primitive.Title>
                {options.body && (
                  <Primitive.Description id="confirm-body" className="mx-auto mt-2 max-w-[36ch] text-sm leading-6 text-[color:var(--muted)]">
                    {options.body}
                  </Primitive.Description>
                )}
                {options.reason && (
                  <label className="mt-6 block text-left text-sm">
                    <span className="mb-2 block font-medium">{options.reason.label}</span>
                    <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="input-clean w-full px-3 py-2.5" />
                  </label>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <button ref={cancel} type="button" onClick={() => onClose(null)} className="btn-secondary justify-center px-4 py-3 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={blocked} className={`justify-center px-4 py-3 text-sm disabled:opacity-50 ${options.danger ? 'btn-danger' : 'btn-primary'}`}>
                  {options.action}
                </button>
              </div>
            </motion.form>
          </Primitive.Content>
        </div>
      </Primitive.Portal>
    </Primitive.Root>
  )
}

export function useConfirm() {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('useConfirm needs ConfirmProvider')
  return ask
}
