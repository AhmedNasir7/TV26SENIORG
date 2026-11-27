'use client'

/**
 * The candidate's side of a live examination: join with the camera before starting, keep it on while
 * answering, and see their own picture so they know what is shared.
 */
import { Camera, CameraOff, Radio, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useLiveRoom, VideoTile } from './LiveRoom'

const passUrl = (examId: number) => `/api/me/exams/${examId}/live`

function JoinButton({ examId, label }: { examId: number; label: string }) {
  const room = useLiveRoom()
  if (!room) return null
  if (room.status === 'joined' && !room.cameraOn) {
    return (
      <button type="button" onClick={() => room.setCamera(true)} className="btn-primary w-full px-5 py-3 text-sm">
        <Camera className="h-4 w-4" aria-hidden="true" /> Turn camera on
      </button>
    )
  }
  return (
    <button type="button" disabled={room.status === 'joining'} onClick={() => room.join(passUrl(examId))} className="btn-primary w-full px-5 py-3 text-sm disabled:opacity-60">
      <Camera className="h-4 w-4" aria-hidden="true" /> {room.status === 'joining' ? 'Connecting...' : label}
    </button>
  )
}

/** Shown on the examination page: the start button appears only once the camera is live. */
export function CameraGate({ examId, children }: { examId: number; children: React.ReactNode }) {
  const room = useLiveRoom()
  if (!room) return null
  const me = room.people.find((p) => p.isLocal)
  const ready = room.status === 'joined' && room.cameraOn

  return (
    <div className="mt-5 space-y-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Radio className="h-4 w-4" aria-hidden="true" /> Live examination: camera required
      </p>
      {me && <VideoTile person={me} />}
      {ready ? (
        <>
          <p role="status" className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> You are in the room. You can start.</p>
          {children}
        </>
      ) : (
        <>
          <p className="text-sm leading-6 opacity-80">Join the live room first. Your examiner sees your camera and the session is recorded.</p>
          <JoinButton examId={examId} label="Turn camera on and join" />
        </>
      )}
      {room.error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{room.error}</p>}
    </div>
  )
}

/** Wraps the running attempt: it is covered whenever the camera or the connection is not live. */
export function CameraGuard({ examId, children }: { examId: number; children: React.ReactNode }) {
  const room = useLiveRoom()
  const tried = useRef(false)
  const join = room?.join

  useEffect(() => {
    if (tried.current || !join) return
    tried.current = true
    void join(passUrl(examId)) // after a reload, return to the room without another press
  }, [examId, join])

  if (!room) return <>{children}</>
  const me = room.people.find((p) => p.isLocal)
  const live = room.status === 'joined' && room.cameraOn
  // After submitting there is nothing left to guard
  if (room.done) return <>{children}</>

  return (
    <>
      {children}
      {me && live && (
        <div className="fixed bottom-4 left-4 z-[45] w-40 shadow-2xl sm:w-56">
          <VideoTile person={me} />
        </div>
      )}
      {!live && (
        <div role="dialog" aria-modal="true" aria-label="Camera required" className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} className="surface-card w-full max-w-md space-y-4 p-8 text-center">
            <CameraOff className="mx-auto h-10 w-10" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold">Camera required</h2>
            <p className="text-sm text-[color:var(--muted)]">This is a live examination. Your time keeps running; turn your camera on to continue.</p>
            {me && <VideoTile person={me} />}
            <JoinButton examId={examId} label="Join the live room" />
            {room.error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{room.error}</p>}
          </motion.div>
        </div>
      )}
    </>
  )
}
