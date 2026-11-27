'use client'

import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import type { HMSPrebuiltRefType } from '@100mslive/roomkit-react'
import RoomLanding from './components/RoomLanding'
import ErrorBoundary from './components/ErrorBoundary'
import { LeaveCallButton } from './components/LeaveCallButton'

// Suppress React 19 ref warnings from @100mslive/roomkit-react
// This is a known issue with the library and doesn't affect functionality
if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Accessing element.ref was removed in React 19')
    ) {
      return // Suppress this specific warning
    }
    originalError(...args)
  }
}

function MeetingLoading({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'danger' }) {
  return (
    <div className="page-shell flex h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <div
          className="text-lg font-semibold"
          style={{ color: tone === 'danger' ? 'var(--danger)' : 'var(--foreground)' }}
        >
          {label}
        </div>
        <div
          className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    </div>
  )
}

const HMSPrebuilt = dynamic(
  async () => {
    try {
      return (await import('@100mslive/roomkit-react')).HMSPrebuilt
    } catch (error) {
      console.error('Failed to load HMSPrebuilt:', error)
      if (error instanceof Error && error.message.includes('ChunkLoadError')) {
        window.location.reload()
      }
      throw error
    }
  },
  {
    ssr: false,
    loading: () => <MeetingLoading label="Loading video call..." />,
  }
)

function MeetingPageContent() {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const hmsRef = useRef<HMSPrebuiltRefType>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('ChunkLoadError') || event.error?.name === 'ChunkLoadError') {
        setChunkError('Failed to load resources. Reloading page...')
        setTimeout(() => window.location.reload(), 2000)
      }
    }
    window.addEventListener('error', handleChunkError)
    return () => window.removeEventListener('error', handleChunkError)
  }, [])

  const joinRoom = useCallback(
    async (roomId?: string, shouldCreate: boolean = false) => {
      setIsLoading(true)
      setError(null)
      try {
        const urlRoomId = roomId || searchParams.get('room')
        let targetRoomId: string

        if (urlRoomId) {
          const checkRes = await fetch('/api/check-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room_id: urlRoomId }),
          })
          if (!checkRes.ok) {
            const errorData = await checkRes.json().catch(() => ({}))
            throw new Error(`Failed to check room: ${checkRes.statusText}. ${JSON.stringify(errorData)}`)
          }
          const checkData = await checkRes.json()
          if (!checkData.exists) throw new Error('Room does not exist. Please create a new room or use a valid room ID.')
          targetRoomId = urlRoomId
        } else if (shouldCreate) {
          const roomRes = await fetch('/api/get-or-create-room', { method: 'POST' })
          if (!roomRes.ok) {
            const errorData = await roomRes.json().catch(() => ({}))
            throw new Error(`Failed to create room: ${roomRes.statusText}. ${JSON.stringify(errorData)}`)
          }
          const roomData = await roomRes.json()
          if (!roomData.id) throw new Error('Room creation failed: No room ID returned')
          targetRoomId = roomData.id
          router.push(`/meeting?room=${targetRoomId}`)
        } else {
          setIsLoading(false)
          return
        }

        await new Promise((r) => setTimeout(r, 500))
        const codeRes = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: targetRoomId, role: 'host' }),
        })
        if (!codeRes.ok) {
          const errorData = await codeRes.json().catch(() => ({}))
          throw new Error(`Failed to generate code: ${codeRes.statusText}. ${JSON.stringify(errorData)}`)
        }
        const codeData = await codeRes.json()
        const code =
          codeData.data?.[0]?.code ?? codeData.code ?? (typeof codeData === 'string' ? codeData : null)
        if (!code) throw new Error('Code generation failed: No code returned in response')
        setRoomCode(code)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [searchParams, router]
  )

  useEffect(() => {
    const urlRoomId = searchParams.get('room')
    if (urlRoomId && !roomCode && !isLoading && isMounted) joinRoom(urlRoomId, false)
  }, [searchParams, roomCode, isLoading, isMounted, joinRoom])

  useEffect(() => {
    if (!isJoined) return
    const currentRef = hmsRef.current
    if (!currentRef?.hmsActions || !currentRef?.hmsStore) return
    let retryCount = 0
    const maxRetries = 10
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isCleanedUp = false

    const enableTracks = async () => {
      if (isCleanedUp) return
      const ref = hmsRef.current
      if (!ref?.hmsActions || !ref?.hmsStore) {
        retryCount++
        if (retryCount < maxRetries) timeoutId = setTimeout(enableTracks, 500)
        return
      }
      const { hmsActions, hmsStore } = ref
      const storeState = hmsStore.getState((s: unknown) => s) as { hmsStates?: { localPeer?: { videoTrack?: { id?: string }; audioTrack?: { id?: string } } }; localPeer?: { videoTrack?: { id?: string }; audioTrack?: { id?: string } } }
      const localPeer = storeState?.hmsStates?.localPeer ?? storeState?.localPeer
      if (!localPeer) {
        retryCount++
        if (retryCount < maxRetries) timeoutId = setTimeout(enableTracks, 500)
        return
      }
      const vt = localPeer.videoTrack
      const at = localPeer.audioTrack
      if (vt?.id) try { await hmsActions.setEnabledTrack(vt.id, true) } catch {}
      if (at?.id) try { await hmsActions.setEnabledTrack(at.id, true) } catch {}
    }
    timeoutId = setTimeout(enableTracks, 2000)
    return () => {
      isCleanedUp = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isJoined])

  if (!isMounted) {
    return (
<MeetingLoading label="Loading..." />
    )
  }

  if (!roomCode && !searchParams.get('room')) {
    return (
      <>
        <RoomLanding onCreateRoom={() => joinRoom(undefined, true)} onJoinRoom={(id) => { router.push(`/meeting?room=${id}`); joinRoom(id, false) }} />
        {error && (
          <div
            className="fixed bottom-4 right-4 z-50 rounded-[var(--radius-sm)] px-6 py-3 shadow-[var(--shadow-md)]"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            {error}
          </div>
        )}
      </>
    )
  }

  if (chunkError) {
    return (
<MeetingLoading label={chunkError ?? ''} tone="danger" />
    )
  }

  if (!roomCode && isLoading) {
    return (
<MeetingLoading label="Joining meeting..." />
    )
  }

  if (!roomCode) return null

  return (
    <div className="prebuilt-container" style={{ height: '100vh', position: 'relative' }}>
      <ErrorBoundary>
        <HMSPrebuilt
          ref={hmsRef}
          roomCode={roomCode}
          containerSelector=".prebuilt-container"
          onJoin={() => {
            setIsJoined(true)
            setIsLoading(false)
            setTimeout(() => {
              const ref = hmsRef.current
              if (ref?.hmsActions && ref?.hmsStore) {
                const { hmsActions, hmsStore } = ref
                const s = hmsStore.getState((x: unknown) => x) as { hmsStates?: { localPeer?: { videoTrack?: { id?: string }; audioTrack?: { id?: string } } }; localPeer?: { videoTrack?: { id?: string }; audioTrack?: { id?: string } } }
                const peer = s?.hmsStates?.localPeer ?? s?.localPeer
                if (peer?.videoTrack?.id) hmsActions.setEnabledTrack(peer.videoTrack.id, true).catch(() => {})
                if (peer?.audioTrack?.id) hmsActions.setEnabledTrack(peer.audioTrack.id, true).catch(() => {})
              }
            }, 2000)
          }}
          onLeave={() => {
            setIsJoined(false)
            setRoomCode(null)
            router.push('/')
          }}
        />
      </ErrorBoundary>
      {isJoined && <LeaveCallButton hmsRef={hmsRef} />}
    </div>
  )
}

export default function MeetingPageClient() {
  return (
    <Suspense
      fallback={
        <MeetingLoading label="Loading..." />
      }
    >
      <MeetingPageContent />
    </Suspense>
  )
}
