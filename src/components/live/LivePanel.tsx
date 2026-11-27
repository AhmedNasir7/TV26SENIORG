'use client'

/** The examiner's controls for a live examination: switch it on, watch the cameras, record. */
import { Circle, Download, Eye, Radio, Square, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { LocalTime } from '@/components/ui/LocalTime'
import { apiRequest } from '@/lib/client/request'
import { LiveRoomProvider, useLiveRoom, VideoTile } from './LiveRoom'

type State = {
  configured: boolean
  enabled: boolean
  recording: boolean
  problem: string
  assets: Array<{ id: string; type: string; status: string; duration?: number; created_at?: string }>
}

export function LivePanel({ examId }: { examId: number }) {
  return (
    <LiveRoomProvider>
      <Panel examId={examId} />
    </LiveRoomProvider>
  )
}

function Panel({ examId }: { examId: number }) {
  const room = useLiveRoom()!
  const confirm = useConfirm()
  const [state, setState] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const url = `/api/exams/${examId}/live`

  const act = useCallback(async (request: () => Promise<State>) => {
    setBusy(true)
    setError('')
    try {
      setState(await request())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    let stop = false
    apiRequest<State>(url, 'GET')
      .then((data) => !stop && setState(data))
      .catch((err) => !stop && setError(err instanceof Error ? err.message : 'Could not read the live settings'))
    return () => {
      stop = true
    }
  }, [url])

  async function toggle(enabled: boolean) {
    const ok = await confirm(
      enabled
        ? { title: 'Make this examination live?', body: 'Candidates must turn their camera on and join the room before they can answer. The session is recorded.', action: 'Go live' }
        : { title: 'End live mode?', body: 'Recording stops and cameras are no longer required.', action: 'End live', danger: true }
    )
    if (!ok) return
    if (!enabled) await room.leave()
    await act(() => apiRequest<State>(url, 'PUT', { enabled }))
  }

  if (!state) return <section className="surface-card p-8 text-sm text-[color:var(--muted)]">{error || 'Checking live video...'}</section>
  const candidates = room.people.filter((p) => !p.isLocal && !p.name.startsWith('Examiner:'))

  return (
    <section className="surface-card space-y-6 p-8 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="font-display flex items-center gap-2.5 text-lg font-semibold">
            <Radio className="h-5 w-5" aria-hidden="true" /> Live camera examination
            {state.enabled && <span className="badge-highlight"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />Live</span>}
          </h2>
          <p className="mt-1.5 max-w-xl text-[color:var(--muted)]">
            {state.configured ? 'Candidates join a 100ms video room with their camera on before they start.' : '100ms is not set up on this server: add APP_ACCESS_KEY, APP_SECRET_KEY and TEMPLATE_ID.'}
          </p>
        </div>
        <button type="button" disabled={busy || !state.configured} onClick={() => toggle(!state.enabled)} className={`px-5 py-3 ${state.enabled ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`}>
          {state.enabled ? 'End live mode' : 'Make it live'}
        </button>
      </div>

      {state.enabled && (
        <div className="flex flex-wrap items-center gap-3">
          {room.status === 'joined' ? (
            <button type="button" onClick={room.leave} className="btn-secondary px-4 py-2.5"><X className="h-4 w-4" aria-hidden="true" /> Close video wall</button>
          ) : (
            <button type="button" disabled={room.status === 'joining'} onClick={() => room.join(`${url}/token`, { camera: false })} className="btn-secondary px-4 py-2.5 disabled:opacity-60">
              <Eye className="h-4 w-4" aria-hidden="true" /> {room.status === 'joining' ? 'Connecting...' : 'Watch candidates'}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => act(() => apiRequest<State>(`${url}/recording`, 'POST', { record: !state.recording }))} className="btn-secondary px-4 py-2.5 disabled:opacity-60">
            {state.recording ? <Square className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4 fill-[var(--danger)] text-[var(--danger)]" aria-hidden="true" />}
            {state.recording ? 'Stop recording' : 'Start recording'}
          </button>
          <button type="button" disabled={busy} onClick={() => act(() => apiRequest<State>(url, 'GET'))} className="btn-ghost px-4 py-2.5">Refresh</button>
          <p role="status" className="text-[color:var(--muted)]">{state.recording ? 'Recording now' : 'Recording starts when the first candidate begins'}</p>
        </div>
      )}

      {(error || room.error || state.problem) && <p role="alert" style={{ color: 'var(--danger)' }}>{error || room.error || state.problem}</p>}

      {room.status === 'joined' && (
        <div>
          <p className="mb-3 font-medium">{candidates.length} in the room</p>
          {candidates.length === 0 && <p className="text-[color:var(--muted)]">Candidates appear here as they join.</p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {candidates.map((person) => <VideoTile key={person.id} person={person} />)}
          </div>
        </div>
      )}

      {state.assets.length > 0 && (
        <div>
          <h3 className="font-medium">Recordings</h3>
          <ul className="mt-2">
            {state.assets.map((asset) => (
              <li key={asset.id} className="hairline-row flex flex-wrap items-center justify-between gap-3">
                <span>
                  {asset.created_at ? <LocalTime iso={asset.created_at} /> : 'Recording'} · {asset.type.replace(/-/g, ' ')}
                  {asset.duration ? ` · ${Math.round(asset.duration / 60)} min` : ''} · {asset.status}
                </span>
                {asset.status === 'completed' && (
                  <a href={`${url}/recording?asset=${encodeURIComponent(asset.id)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2">
                    <Download className="h-4 w-4" aria-hidden="true" /> Open
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
