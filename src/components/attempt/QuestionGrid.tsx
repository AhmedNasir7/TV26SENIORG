import { Check, Flag } from 'lucide-react'

export type GridItem = { position: number; answered: boolean; marked: boolean; disabled: boolean }

/** State is shown with symbols and spoken labels, never by colour alone. */
export function QuestionGrid({ items, current, onSelect }: { items: GridItem[]; current: number; onSelect: (position: number) => void }) {
  return (
    <nav aria-label="Questions">
      <ol className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.position}>
            <button
              type="button"
              disabled={item.disabled}
              aria-current={item.position === current ? 'step' : undefined}
              aria-label={`Question ${item.position}, ${item.answered ? 'answered' : 'not answered'}${item.marked ? ', marked for review' : ''}`}
              onClick={() => onSelect(item.position)}
              data-answered={item.answered}
              data-marked={item.marked}
              className={`qgrid-btn h-11 min-w-11 px-2 text-sm tabular-nums disabled:opacity-40 ${item.position === current ? 'btn-primary' : 'btn-secondary'}`}
            >
              {item.position}
              {item.answered && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {item.marked && <Flag className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[color:var(--muted)]">
        <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" aria-hidden="true" /> answered</span>
        <span className="inline-flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" aria-hidden="true" /> marked for review</span>
      </p>
    </nav>
  )
}
