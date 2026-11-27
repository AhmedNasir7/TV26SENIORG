'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { currentTheme, setRootTheme, storedTheme, switchTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

/**
 * Light/dark switch. "header" toggles sit in the app bars; the single "floating" one in the root
 * layout only shows on pages that have no header toggle (CSS in theme-motion.css).
 */
export function ThemeToggle({ placement = 'header' }: { placement?: 'header' | 'floating' }) {
  const theme = useTheme()

  useEffect(() => {
    // Another tab changed the stored choice
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setRootTheme(storedTheme() ?? currentTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    // Keyboard activation has no pointer position: start from the button's centre
    const box = event.currentTarget.getBoundingClientRect()
    const fromPointer = event.clientX !== 0 || event.clientY !== 0
    switchTheme(next, {
      x: fromPointer ? event.clientX : box.left + box.width / 2,
      y: fromPointer ? event.clientY : box.top + box.height / 2,
    })
  }

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      data-placement={placement}
      className={`theme-toggle ${placement === 'floating' ? 'theme-toggle-floating' : ''}`}
    >
      <Sun className="icon-sun" aria-hidden="true" />
      <Moon className="icon-moon" aria-hidden="true" />
    </button>
  )
}
