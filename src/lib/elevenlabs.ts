const API_BASE = 'https://api.elevenlabs.io/v1'

// Sarah — Mature, Reassuring, Confident. Fits a property-listing narrator.
const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set')
  return key
}

/** Synthesizes speech from text. Returns raw MP3 bytes. */
export async function synthesizeSpeech(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

/** Transcribes an audio file to text. */
export async function transcribeAudio(file: Blob, filename: string): Promise<string> {
  const formData = new FormData()
  formData.set('file', file, filename)
  formData.set('model_id', 'scribe_v1')

  const res = await fetch(`${API_BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': getApiKey() },
    body: formData,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`ElevenLabs STT failed (${res.status}): ${detail}`)
  }

  const data = await res.json()
  return data.text ?? ''
}
