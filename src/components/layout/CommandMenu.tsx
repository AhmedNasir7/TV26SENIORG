'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { CornerDownLeft, LogOut, Moon, Search, Sun, type LucideIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useTheme } from '@/hooks/useTheme'
import { switchTheme } from '@/lib/theme'

export type CommandItem = { label: string; icon: LucideIcon; group: 'Go to' | 'Actions'; href?: string; run?: () => void }

const noop = () => () => {}
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform)

/** Linear-style command menu (Ctrl/⌘ + K): jump to any page the role can open, or run a quick action. */
export function CommandMenu({ pages, onSignOut }: { pages: CommandItem[]; onSignOut: () => void }) {
  const router = useRouter()
  const theme = useTheme()
  const mac = useSyncExternalStore(noop, isMac, () => false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const items = useMemo<CommandItem[]>(() => {
    const centre = () => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    return [
      ...pages,
      theme === 'dark'
        ? { label: 'Switch to light theme', icon: Sun, group: 'Actions', run: () => switchTheme('light', centre()) }
        : { label: 'Switch to dark theme', icon: Moon, group: 'Actions', run: () => switchTheme('dark', centre()) },
      { label: 'Sign out', icon: LogOut, group: 'Actions', run: onSignOut },
    ]
  }, [pages, theme, onSignOut])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items
  }, [items, query])

  function changeOpen(next: boolean) {
    setOpen(next)
    setQuery('')
    setActive(0)
  }

  function choose(item: CommandItem | undefined) {
    if (!item) return
    changeOpen(false)
    if (item.href) router.push(item.href)
    // Let the dialog close first so the theme reveal doesn't capture it
    else if (item.run) window.setTimeout(item.run, 160)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (results.length ? (i + step + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[active])
    }
  }

  return (
    <>
      <button type="button" onClick={() => changeOpen(true)} className="btn-secondary h-9 gap-2 px-2.5 text-sm text-[color:var(--muted)]" aria-label="Open command menu">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">Search</span>
        <span className="kbd hidden sm:inline-flex">{mac ? '⌘' : 'Ctrl'} K</span>
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent showCloseButton={false} className="top-[18%]! translate-y-0! gap-0! overflow-hidden p-0! sm:max-w-xl! shadow-[var(--shadow-md)]">
          <DialogTitle className="sr-only">Command menu</DialogTitle>
          <DialogDescription className="sr-only">Type to filter pages and actions, use the arrow keys and press Enter.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
            <Search className="h-4 w-4 text-[color:var(--muted)]" aria-hidden="true" />
            <input

              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0) }}
              onKeyDown={onKeyDown}
              placeholder="Go to a page or run an action..."
              aria-label="Search pages and actions"
              aria-controls="command-results"
              aria-activedescendant={results[active] ? `command-${active}` : undefined}
              className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-[color:var(--muted)]"
            />
          </div>
          <ul id="command-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[color:var(--muted)]">No matches</li>}
            {results.map((item, index) => {
              const Icon = item.icon
              const groupStart = index === 0 || results[index - 1].group !== item.group
              return (
                <li key={`${item.group}-${item.label}`} role="presentation">
                  {groupStart && <p className="px-3 pb-1 pt-2 text-xs text-[color:var(--muted)]">{item.group}</p>}
                  <button
                    id={`command-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(item)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm transition-colors ${
                      index === active ? 'bg-[var(--surface-muted)] text-[color:var(--foreground)]' : 'text-[color:var(--muted)]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {index === active && <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-3 border-t border-[var(--border)] px-4 py-2 text-xs text-[color:var(--muted)]">
            <span><span className="kbd">↑</span> <span className="kbd">↓</span> move</span>
            <span><span className="kbd">Enter</span> open</span>
            <span><span className="kbd">Esc</span> close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
