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
              className={`h-11 min-w-11 px-2 text-sm tabular-nums disabled:opacity-40 ${item.position === current ? 'btn-primary' : 'btn-secondary'}`}
            >
              {item.position}
              {item.answered && <span aria-hidden="true"> ✓</span>}
              {item.marked && <span aria-hidden="true"> ⚑</span>}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-[color:var(--muted)]">✓ answered · ⚑ marked for review · plain number: not answered</p>
    </nav>
  )
}
