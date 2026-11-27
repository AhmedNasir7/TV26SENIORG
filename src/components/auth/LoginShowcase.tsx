import { Clock3, LockKeyhole } from 'lucide-react'

/** Sign-in side panel: two Linear-style highlighter cards describing what the platform guarantees. */
export function LoginShowcase() {
  return (
    <aside aria-label="About the platform" className="hidden min-h-full flex-col justify-center gap-2 lg:flex">
      <figure className="glow-card relative flex min-h-[300px] flex-col justify-between overflow-hidden p-8">
        <LockKeyhole
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-6 h-64 w-64 text-white opacity-30"
          strokeWidth={1.25}
        />
        <blockquote className="font-serif relative max-w-[24ch] text-[30px] leading-[36px]">
          “Every answer is saved as it is typed, and the clock is kept by the server, not the browser.”
        </blockquote>
        <figcaption className="relative mt-8 flex items-center gap-3 text-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/60">
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold">Attempt engine</span>
            <span className="block opacity-70">Autosave, resume and server-side timing</span>
          </span>
        </figcaption>
      </figure>
      <div className="grid grid-cols-[1.25fr_1fr] gap-2">
        <figure className="highlight-card flex min-h-[200px] flex-col justify-between p-6">
          <blockquote className="font-display max-w-[20ch] text-xl font-semibold leading-snug tracking-tight">
            “Results go out only once every written answer is marked.”
          </blockquote>
          <figcaption className="mt-6 text-sm">
            <span className="block font-semibold">Marking and publication</span>
            <span className="block opacity-70">Checked before release</span>
          </figcaption>
        </figure>
        <div className="surface-card flex flex-col justify-between p-6">
          <Clock3 className="h-5 w-5 text-[color:var(--muted)]" aria-hidden="true" />
          <div>
            <p className="stat-figure text-4xl font-semibold">5 s</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">grace on the server deadline, never more</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
