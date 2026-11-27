/**
 * The 100ms server API: rooms, join tokens, who is in a room, and recordings. Keys stay on the server;
 * a browser only ever receives a token for one room, one person and one role.
 */
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { getManagementToken } from '@/lib/hms'
import { ApiError } from '@/lib/server/api'

const BASE = 'https://api.100ms.live/v2'

export const liveConfigured = () =>
  Boolean(process.env.APP_ACCESS_KEY && process.env.APP_SECRET_KEY && process.env.TEMPLATE_ID)

function requireConfigured() {
  if (!liveConfigured()) {
    throw new ApiError('CONFLICT', 'Live video is not set up: add APP_ACCESS_KEY, APP_SECRET_KEY and TEMPLATE_ID on the server.')
  }
}

async function call<T>(path: string, init?: { method?: string; body?: object; missing?: T }): Promise<T> {
  requireConfigured()
  const response = await fetch(BASE + path, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${getManagementToken()}`, 'Content-Type': 'application/json' },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  if (!response) throw new ApiError('SERVER_ERROR', 'The video service could not be reached. Try again.')
  if (response.status === 404 && init?.missing !== undefined) return init.missing
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('100ms error', response.status, path, data)
    const reason = (data as { message?: string; description?: string }).message ?? (data as { description?: string }).description
    throw new ApiError('CONFLICT', `Video service: ${reason ?? `request refused (${response.status})`}`)
  }
  return data as T
}

type Template = { roles?: Record<string, { publishParams?: { allowed?: string[] } }> }
let cached: { staff: string; candidate: string } | null = null

/** Role names come from the room template; both can be fixed with HMS_STAFF_ROLE and HMS_CANDIDATE_ROLE. */
export async function roomRoles() {
  if (cached) return cached
  const template = await call<Template>(`/templates/${encodeURIComponent(process.env.TEMPLATE_ID ?? '')}`).catch(() => null)
  const roles = template?.roles ?? {}
  const sends = (name: string) => roles[name] && (roles[name].publishParams?.allowed?.includes('video') ?? true)
  const pick = (wanted: Array<string | undefined>, fallback: string) =>
    wanted.find((name): name is string => Boolean(name && (template ? sends(name) : false))) ?? Object.keys(roles).find(sends) ?? fallback
  const result = {
    staff: process.env.HMS_STAFF_ROLE || pick(['proctor', 'examiner', 'host', 'broadcaster'], 'host'),
    candidate: process.env.HMS_CANDIDATE_ROLE || pick(['candidate', 'student', 'guest', 'broadcaster', 'host'], 'guest'),
  }
  if (template) cached = result
  return result
}

export const createRoom = (name: string) =>
  call<{ id: string }>('/rooms', { method: 'POST', body: { name, template_id: process.env.TEMPLATE_ID } })

/** A short-lived pass into one room for one person. */
export function joinToken(roomId: string, userId: string, role: string) {
  requireConfigured()
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { access_key: process.env.APP_ACCESS_KEY, room_id: roomId, user_id: userId, role, type: 'app', version: 2, iat: now, nbf: now - 10, jti: randomUUID() },
    process.env.APP_SECRET_KEY!,
    { algorithm: 'HS256', expiresIn: '8h' }
  )
}

type Peer = { user_id?: string }

/** The user ids connected to the room right now. */
export async function presentUsers(roomId: string) {
  const data = await call<{ peers?: Record<string, Peer> | Peer[] }>(`/active-rooms/${roomId}/peers`, { missing: {} })
  return new Set(Object.values(data.peers ?? {}).map((peer) => peer.user_id))
}

export type Recording = { id: string; status: string; created_at?: string }

export const listRecordings = async (roomId: string) =>
  (await call<{ data?: Recording[] }>(`/recordings?room_id=${roomId}&limit=20`, { missing: {} })).data ?? []

export const isRecording = (list: Recording[]) => list.some((r) => ['starting', 'running'].includes(r.status))

export const startRecording = (roomId: string) =>
  call<Recording>(`/recordings/room/${roomId}/start`, {
    method: 'POST',
    body: { resolution: { width: 1280, height: 720 }, ...(process.env.HMS_RECORDING_URL && { meeting_url: process.env.HMS_RECORDING_URL }) },
  })

export const stopRecording = (roomId: string) => call<object>(`/recordings/room/${roomId}/stop`, { method: 'POST', missing: {} })

export type Asset = { id: string; type: string; status: string; room_id?: string; duration?: number; created_at?: string }

export const listAssets = async (roomId: string) =>
  (await call<{ data?: Asset[] }>(`/recording-assets?room_id=${roomId}&limit=20`, { missing: {} })).data ?? []

export const assetLink = async (assetId: string) =>
  (await call<{ url: string }>(`/recording-assets/${encodeURIComponent(assetId)}/presigned-url`)).url
