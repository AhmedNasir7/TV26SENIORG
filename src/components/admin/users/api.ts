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

/** Calls an admin API and turns the shared error shape into one readable message. */
export async function adminRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fields = data.error?.fields ? Object.values(data.error.fields).join('. ') : ''
    throw new Error(fields || data.error?.message || 'The request failed')
  }
  return data as T
}
