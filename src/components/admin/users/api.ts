import type { Role } from '@/lib/roles'

export type UserRow = {
  id: number
  email: string
  name: string | null
  role: Role
  status: 'ACTIVE' | 'DISABLED'
  mustChangePassword: boolean
  lockedUntil: string | null
  createdAt: string
}

export type Credentials = { email: string; emailed: boolean; temporaryPassword?: string }

export { apiRequest as adminRequest } from '@/lib/client/request'
