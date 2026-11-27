export const ROLES = ['ADMIN', 'EXAMINER', 'CANDIDATE'] as const
export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * - ADMIN: users, roles, platform operations, plus everything an examiner can do
 * - EXAMINER: examinations, questions, candidates, monitoring, grading, results
 * - CANDIDATE: takes assigned examinations and views own published results
 */

// Roles allowed into the staff console
export const STAFF_ROLES: Role[] = ['ADMIN', 'EXAMINER']

export function isStaff(role: string | null | undefined): boolean {
  return isRole(role) && STAFF_ROLES.includes(role)
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === 'ADMIN'
}

export function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
}

export function roleBadgeVariant(role: string): 'accent' | 'success' | 'secondary' {
  if (role === 'ADMIN') return 'accent'
  if (role === 'EXAMINER') return 'success'
  return 'secondary'
}
