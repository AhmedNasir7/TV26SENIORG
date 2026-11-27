'use client'

import { useRef, useState } from 'react'
import { toast } from '@/components/ui/ToasterProvider'

type RecorderState = 'idle' | 'recording' | 'transcribing'

export function VoiceRecorder({ onTranscribed }: { onTranscribed: (text: string) => void }) {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (timerRef.current) clearInterval(timerRef.current)

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setState('transcribing')
        try {
          const formData = new FormData()
          formData.set('audio', blob, 'voice-note.webm')
          const res = await fetch('/api/support/transcribe', { method: 'POST', body: formData })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Transcription failed')
          if (!data.text?.trim()) {
            toast.error("Couldn't make out any speech — try again")
          } else {
            onTranscribed(data.text.trim())
          }
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : 'Failed to transcribe recording')
        } finally {
          setState('idle')
          setSeconds(0)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setState('recording')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      toast.error('Microphone access denied or unavailable')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (state === 'recording') {
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="btn-secondary flex items-center gap-2 px-3 py-2 text-xs"
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
      >
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: 'var(--danger)' }} />
        Stop recording · {minutes}:{secs.toString().padStart(2, '0')}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={state === 'transcribing'}
      className="btn-secondary px-3 py-2 text-xs disabled:opacity-60"
    >
      {state === 'transcribing' ? 'Transcribing...' : '🎙 Record a voice note instead'}
    </button>
  )
}
