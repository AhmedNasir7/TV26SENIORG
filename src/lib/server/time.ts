/**
 * The server clock is the only source of "now" for anything that matters: availability,
 * deadlines, saves and submissions. Client timestamps are never trusted.
 */
export const serverNow = () => new Date()

export type ExamPhase = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED'

/** The four lifecycle states, derived from the stored status and the server clock. */
export function examPhase(
  exam: { status: 'DRAFT' | 'PUBLISHED'; startsAt: Date; endsAt: Date },
  now: Date = serverNow()
): ExamPhase {
  if (exam.status === 'DRAFT') return 'DRAFT'
  if (now < exam.startsAt) return 'PUBLISHED'
  return now < exam.endsAt ? 'ONGOING' : 'COMPLETED'
}
