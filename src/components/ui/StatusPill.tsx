import { PHASE_LABEL } from '@/lib/exam-labels'
import type { ExamPhase } from '@/lib/server/time'

const CLASS: Record<ExamPhase, string> = {
  DRAFT: 'status-draft',
  PUBLISHED: 'status-upcoming',
  ONGOING: 'status-open',
  COMPLETED: 'status-done',
}

/** Linear-style status glyphs: dashed (draft), ring (upcoming), half-filled (open), check (completed). */
export function StatusIcon({ phase }: { phase: ExamPhase }) {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      {phase === 'DRAFT' && <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 2.2" />}
      {phase === 'PUBLISHED' && <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />}
      {phase === 'ONGOING' && (
        <>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
        </>
      )}
      {phase === 'COMPLETED' && (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path d="M4.4 7.2l1.8 1.8 3.4-3.6" stroke="var(--surface)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

export function StatusPill({ phase }: { phase: ExamPhase }) {
  return (
    <span className={`status-pill ${CLASS[phase]}`}>
      <StatusIcon phase={phase} />
      {PHASE_LABEL[phase]}
    </span>
  )
}
