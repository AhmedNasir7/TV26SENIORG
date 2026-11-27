// Light/dark theme: dark unless the visitor chose light (kept in localStorage).
// The init script runs before first paint (app/layout.tsx) so there is no flash of the wrong theme.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'secureexam-theme'
export const THEME_EVENT = 'secureexam:themechange'
const REVEAL_MS = 700

/** Inlined into <head>; keep it dependency-free and tiny. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var d=s!=='light';var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`

export function currentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

/** Applies the theme to <html> without animation and tells every toggle on the page. */
export function setRootTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }))
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

/**
 * Switches theme with a circular reveal from (x, y) and a lime highlighter ring on its edge.
 * Falls back to a colour cross-fade without the View Transitions API, and to an instant
 * switch when the user prefers reduced motion.
 */
export function switchTheme(next: Theme, origin: { x: number; y: number }) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // Private mode: the switch still applies for this page view
  }

  const doc = document as ViewTransitionDocument
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    setRootTheme(next)
    return
  }

  if (!doc.startViewTransition) {
    const root = document.documentElement
    root.classList.add('theme-fading')
    setRootTheme(next)
    window.setTimeout(() => root.classList.remove('theme-fading'), 450)
    return
  }

  const { x, y } = origin
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const ring = document.createElement('div')
  ring.className = 'theme-ring'
  ring.setAttribute('aria-hidden', 'true')
  ring.style.setProperty('--ring-x', `${x}px`)
  ring.style.setProperty('--ring-y', `${y}px`)
  ring.style.setProperty('--ring-r', `${radius}px`)
  ring.style.setProperty('--ring-duration', `${REVEAL_MS}ms`)

  const transition = doc.startViewTransition(() => {
    setRootTheme(next)
    document.body.appendChild(ring)
  })

  transition.ready
    .then(() => {
      ring.setAttribute('data-running', '')
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    })
    .catch(() => {})

  const cleanup = () => ring.remove()
  transition.finished.then(cleanup, cleanup)
}
