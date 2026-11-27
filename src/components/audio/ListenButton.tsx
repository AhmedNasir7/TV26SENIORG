'use client'

import { useEffect, useRef, useState } from 'react'

type ListenState = 'idle' | 'loading' | 'playing' | 'error'

export function ListenButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  const [state, setState] = useState<ListenState>('idle')
  const audioRef = useRef<HTMLAudioElement>(null)
  const urlRef = useRef<string | null>(null)

  // Release the generated audio when the button goes away or the text changes
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    },
    [text]
  )

  async function play(audio: HTMLAudioElement) {
    try {
      await audio.play()
      setState('playing')
    } catch (err) {
      // Browsers can refuse playback without a fresh tap; the next click retries.
      console.error('Playback blocked:', err)
      setState('idle')
    }
  }

  async function handleClick() {
    const audio = audioRef.current
    if (state === 'loading' || !audio) return
    if (state === 'playing') {
      audio.pause()
      setState('idle')
      return
    }
    if (urlRef.current) return play(audio)

    setState('loading')
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Narration failed')
      urlRef.current = URL.createObjectURL(await res.blob())
      audio.src = urlRef.current
      await play(audio)
    } catch (err) {
      console.error('Narration error:', err)
      setState('error')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
      >
        {state === 'loading' && 'Generating audio...'}
        {state === 'idle' && label}
        {state === 'playing' && 'Pause'}
        {state === 'error' && 'Audio unavailable, try again'}
      </button>
      <audio ref={audioRef} preload="none" onEnded={() => setState('idle')} className="hidden" />
    </>
  )
}
