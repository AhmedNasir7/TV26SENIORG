import type { Role } from '@/lib/roles'

export const HOME_PATH: Record<Role, string> = {
  ADMIN: '/admin',
  EXAMINER: '/examiner',
  CANDIDATE: '/candidate',
}
