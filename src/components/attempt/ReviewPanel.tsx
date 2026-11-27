import { QuestionGrid, type GridItem } from './QuestionGrid'

type Props = {
  items: GridItem[]
  busy: boolean
  onSelect: (position: number) => void
  onCancel: () => void
  onSubmit: () => void
}

export function ReviewPanel({ items, busy, onSelect, onCancel, onSubmit }: Props) {
  const answered = items.filter((i) => i.answered).length
  const marked = items.filter((i) => i.marked).length

  return (
    <section aria-label="Review before submitting" className="surface-card space-y-4 p-5">
      <h2 className="font-display text-lg font-semibold">Review before submitting</h2>
      <p className="text-sm">
        {answered} answered · {items.length - answered} not answered · {marked} marked for review
      </p>
      <QuestionGrid items={items} current={0} onSelect={onSelect} />
      <p className="text-sm text-[color:var(--muted)]">After submitting you cannot change any answer.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={onSubmit} className="btn-primary px-5 py-2.5 text-sm disabled:opacity-60">
          {busy ? 'Submitting...' : 'Submit now'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className="btn-secondary px-4 py-2.5 text-sm">
          Keep working
        </button>
      </div>
    </section>
  )
}
