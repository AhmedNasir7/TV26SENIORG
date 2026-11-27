/**
 * Who may do what to which record. Every examination route asks here after `requireUser`.
 * Administrators have full staff access; examiners only to what they own; candidates only to their own.
 */
import { ApiError } from '@/lib/server/api'
import type { Role } from '@/lib/roles'

export type Actor = { id: number; role: Role }

type Owned = { ownerId: number }
type AttemptRef = { candidateId: number; isSandbox: boolean; exam: Owned }

const isOwningStaff = (actor: Actor, record: Owned) =>
  actor.role === 'ADMIN' || (actor.role === 'EXAMINER' && record.ownerId === actor.id)

export const canManageExam = (actor: Actor, exam: Owned) => isOwningStaff(actor, exam)

export const canManageQuestion = (actor: Actor, question: Owned) => isOwningStaff(actor, question)

/** Eligibility only. The availability window and attempt state are checked by the exam services. */
export const canAttemptExam = (actor: Actor, isEnrolled: boolean) => actor.role === 'CANDIDATE' && isEnrolled

export const canViewAttempt = (actor: Actor, attempt: AttemptRef) =>
  isOwningStaff(actor, attempt.exam) || (attempt.candidateId === actor.id && !attempt.isSandbox)

export const canGrade = (actor: Actor, exam: Owned) => isOwningStaff(actor, exam)

export const canViewResult = (actor: Actor, attempt: AttemptRef, resultsPublished: boolean) =>
  isOwningStaff(actor, attempt.exam) ||
  (attempt.candidateId === actor.id && !attempt.isSandbox && resultsPublished)

/**
 * Returns the record if allowed. Missing and forbidden look identical (404),
 * so nobody can discover which records exist by changing an id.
 */
export function ensureFound<T>(record: T | null | undefined, allowed: (record: T) => boolean): T {
  if (record == null || !allowed(record)) throw new ApiError('NOT_FOUND', 'Not found')
  return record
}
