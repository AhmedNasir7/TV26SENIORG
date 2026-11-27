import { ChevronLeft, ChevronRight } from 'lucide-react'
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-[color:var(--muted)]">
        Page {page} of {totalPages} · {total} total entries
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
        ><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
        >Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
      </div>
    </div>
  )
}
