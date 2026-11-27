import { notFound } from 'next/navigation'
import { ApiError } from '@/lib/server/api'

/** Runs a service for a page, turning "not found" (including "not yours") into the 404 page. */
export async function loadById<T>(rawId: string, load: (id: number) => Promise<T>): Promise<T> {
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) notFound()
  return load(id).catch((error) => {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound()
    throw error
  })
}
