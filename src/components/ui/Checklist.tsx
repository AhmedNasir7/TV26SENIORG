import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'

export type ChecklistItem = { label: string; state: 'done' | 'required' | 'warning' }

const PREFIX = { done: 'Done', required: 'Required', warning: 'Warning' } as const

/** Readiness checklist: the icon shape carries the state, the prefix stays for screen readers. */
export function Checklist({ items, label }: { items: ChecklistItem[]; label: string }) {
  return (
    <ul aria-label={label} className="checklist text-sm">
      {items.map((item) => {
        const Icon = item.state === 'done' ? CircleCheck : item.state === 'required' ? CircleX : TriangleAlert
        return (
          <li key={item.label} data-state={item.state}>
            <Icon aria-hidden="true" />
            <span>
              <span className="sr-only">{PREFIX[item.state]}: </span>
              {item.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
