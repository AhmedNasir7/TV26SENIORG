import { getCurrentUser } from '@/lib/auth'
import { isAdmin, isStaff } from '@/lib/roles'

/** Admin only: user management, site settings. */
export async function requireAdmin() {
  const user = await getCurrentUser()
  return user && isAdmin(user.role) ? user : null
}

/** Admin or examiner: the staff console. */
export async function requireStaff() {
  const user = await getCurrentUser()
  return user && isStaff(user.role) ? user : null
}
