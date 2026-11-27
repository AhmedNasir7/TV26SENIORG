import { Check } from 'lucide-react'

const STEPS = ['Read the instructions', 'Take the examination', 'Submitted', 'Result']

/** Where a candidate is on the way from instructions to result. `current` counts from 0. */
export function CandidateSteps({ current }: { current: number }) {
  return (
    <ol aria-label="Your progress" className="surface-card flex flex-wrap gap-x-5 gap-y-2 p-3 text-sm">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={index === current ? 'step' : undefined} className={`flex items-center gap-2 ${index === current ? 'font-semibold' : 'text-[color:var(--muted)]'}`}>
          <span aria-hidden="true" className={`grid h-6 w-6 place-items-center rounded-full border text-xs tabular-nums ${index === current ? 'highlight-card rounded-full!' : 'border-[var(--border-strong)]'}`}>
            {index < current ? <Check className="h-3.5 w-3.5" /> : index + 1}
          </span>
          {label}
          <span className="sr-only">{index < current ? ' (done)' : ''}</span>
        </li>
      ))}
    </ol>
  )
}
