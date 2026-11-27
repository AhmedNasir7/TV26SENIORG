'use client'

import { Mic, Square } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'

const MAX_SECONDS = 60

/** Speech to text for typing by voice. Hidden when the server has no speech service. */
export function DictateButton({ onText }: { onText: (text: string) => void }) {
  const features = useFeatures()
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle')
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)

  if (!features.speech) return null

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const media = new MediaRecorder(stream)
      const chunks: Blob[] = []
      const limit = setTimeout(() => media.state === 'recording' && media.stop(), MAX_SECONDS * 1000)
      media.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      media.onstop = async () => {
        clearTimeout(limit)
        stream.getTracks().forEach((t) => t.stop())
        setState('working')
        try {
          const form = new FormData()
          form.set('audio', new Blob(chunks, { type: media.mimeType || 'audio/webm' }), 'dictation.webm')
          const res = await fetch('/api/support/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Could not transcribe')
          if (data.text?.trim()) onText(data.text.trim())
          else setError('No speech heard')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not transcribe')
        } finally {
          setState('idle')
        }
      }
      recorder.current = media
      media.start()
      setState('recording')
    } catch {
      setError('Microphone not available')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</span>}
      <button
        type="button"
        disabled={state === 'working'}
        onClick={() => (state === 'recording' ? recorder.current?.stop() : start())}
        className={`px-3 py-2 text-xs disabled:opacity-60 ${state === 'recording' ? 'btn-danger' : 'btn-secondary'}`}
      >
        {state === 'recording' ? <Square className="h-3.5 w-3.5" aria-hidden="true" /> : <Mic className="h-3.5 w-3.5" aria-hidden="true" />}
        {state === 'recording' ? 'Stop' : state === 'working' ? 'Writing...' : 'Dictate'}
      </button>
    </span>
  )
}
