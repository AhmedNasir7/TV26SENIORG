'use client'

/** One connection to a 100ms room, shared by every part of a page that shows or controls it. */
import type { HMSReactiveStore } from '@100mslive/hms-video-store'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '@/lib/client/request'

export type Person = { id: string; name: string; isLocal: boolean; role: string; trackId?: string; videoOn: boolean }
type Status = 'idle' | 'joining' | 'joined'

type Room = {
  status: Status
  error: string
  people: Person[]
  cameraOn: boolean
  join: (passUrl: string, options?: { camera: boolean }) => Promise<void>
  leave: () => Promise<void>
  /** The examination is over: leave the room and stop asking for the camera. */
  finish: () => Promise<void>
  done: boolean
  setCamera: (on: boolean) => Promise<void>
  attach: (trackId: string, element: HTMLVideoElement) => () => void
}

const RoomContext = createContext<Room | null>(null)

export function LiveRoomProvider({ children }: { children: React.ReactNode }) {
  const hms = useRef<HMSReactiveStore | null>(null)
  const stops = useRef<Array<() => void>>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [done, setDone] = useState(false)

  const leave = useCallback(async () => {
    stops.current.splice(0).forEach((stop) => stop())
    const current = hms.current
    hms.current = null
    setStatus('idle')
    setPeople([])
    await current?.getActions().leave().catch(() => {})
  }, [])

  const finish = useCallback(async () => {
    setDone(true)
    // Switch the camera off first so the light goes out at once, then leave the room
    await hms.current?.getActions().setLocalVideoEnabled(false).catch(() => {})
    await leave()
  }, [leave])

  const join = useCallback(async (passUrl: string, options = { camera: true }) => {
    if (hms.current) return
    setError('')
    setStatus('joining')
    try {
      const pass = await apiRequest<{ token: string; name: string }>(passUrl, 'POST')
      const { HMSReactiveStore, selectIsConnectedToRoom, selectPeers, selectTrackByID } = await import('@100mslive/hms-video-store')
      const reactive = new HMSReactiveStore()
      reactive.triggerOnSubscribe()
      hms.current = reactive
      const store = reactive.getStore()

      let last = ''
      const sync = () => {
        const next: Person[] = store.getState(selectPeers).map((peer) => ({
          id: peer.id,
          name: peer.name,
          isLocal: peer.isLocal,
          role: peer.roleName ?? '',
          trackId: peer.videoTrack,
          videoOn: Boolean(peer.videoTrack && store.getState(selectTrackByID(peer.videoTrack))?.enabled),
        }))
        const key = JSON.stringify(next)
        if (key !== last) {
          last = key
          setPeople(next)
        }
        if (store.getState(selectIsConnectedToRoom)) setStatus('joined')
      }
      stops.current.push(store.subscribe(sync, (state) => state))
      stops.current.push(
        reactive.getNotifications().onNotification((note) => {
          if (note.type !== 'ERROR') return
          const data = note.data as { message?: string; description?: string; isTerminal?: boolean }
          setError(data.description || data.message || 'The video connection reported a problem')
          if (data.isTerminal) void leave()
        })
      )
      await reactive.getActions().join({
        userName: pass.name,
        authToken: pass.token,
        settings: { isAudioMuted: !options.camera, isVideoMuted: !options.camera },
        rememberDeviceSelection: true,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the room')
      await leave()
    }
  }, [leave])

  const setCamera = useCallback(async (on: boolean) => {
    try {
      await hms.current?.getActions().setLocalVideoEnabled(on)
    } catch {
      setError('The camera could not be switched. Check the browser permission.')
    }
  }, [])

  const attach = useCallback((trackId: string, element: HTMLVideoElement) => {
    void hms.current?.getActions().attachVideo(trackId, element)
    return () => void hms.current?.getActions().detachVideo(trackId, element)
  }, [])

  // Leaving the examination's pages ends the call
  useEffect(() => () => void leave(), [leave])

  const cameraOn = people.some((p) => p.isLocal && p.videoOn)
  const value = useMemo(
    () => ({ status, error, people, cameraOn, join, leave, finish, done, setCamera, attach }),
    [status, error, people, cameraOn, join, leave, finish, done, setCamera, attach]
  )
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export const useLiveRoom = () => useContext(RoomContext)

export function VideoTile({ person, className = '' }: { person: Person; className?: string }) {
  const room = useLiveRoom()
  const video = useRef<HTMLVideoElement>(null)
  const attach = room?.attach
  const { trackId, videoOn } = person

  useEffect(() => {
    if (!attach || !trackId || !videoOn || !video.current) return
    return attach(trackId, video.current)
  }, [attach, trackId, videoOn])

  return (
    <figure className={`relative aspect-video overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-black ${className}`}>
      <video ref={video} autoPlay muted playsInline className={`h-full w-full object-cover ${person.isLocal ? '-scale-x-100' : ''} ${videoOn ? '' : 'opacity-0'}`} />
      {!videoOn && <p className="absolute inset-0 grid place-items-center text-sm text-white/70">Camera off</p>}
      <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6 text-xs font-medium text-white">
        <span className={`h-2 w-2 rounded-full ${videoOn ? 'bg-[#0fc27b]' : 'bg-[#ff5b59]'}`} aria-hidden="true" />
        <span className="truncate">{person.isLocal ? 'You' : person.name}</span>
      </figcaption>
    </figure>
  )
}
