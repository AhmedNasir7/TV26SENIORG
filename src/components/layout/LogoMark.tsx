/** Invigil mark: a hexagon watching over a single point, with a check for a verified result. */
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16 1.5 28.6 8.75v14.5L16 30.5 3.4 23.25V8.75Z" fill="var(--logo-tile, #17181c)" />
      <path d="M8.5 16c2-3.6 4.5-5.4 7.5-5.4s5.5 1.8 7.5 5.4c-2 3.6-4.5 5.4-7.5 5.4S10.5 19.6 8.5 16Z" fill="none" stroke="var(--logo-line, #e4f222)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m13.3 16.1 2 2 3.6-3.9" fill="none" stroke="var(--logo-line, #e4f222)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
