export class RequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

/** Calls an API and turns the shared error shape into one readable message. Browser only. */
export async function apiRequest<T>(url: string, method = 'GET', body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...init,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const fields = data.error?.fields ? Object.values(data.error.fields).join('. ') : ''
    throw new RequestError(fields || data.error?.message || 'The request failed', res.status)
  }
  return data as T
}
