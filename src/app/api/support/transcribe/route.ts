import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { transcribeAudio } from '@/lib/elevenlabs'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10MB — a few minutes of recorded voice

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file || !file.size) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 })
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Recording is too long (max 10MB)' }, { status: 400 })
    }

    const text = await transcribeAudio(file, file.name || 'voice-note.webm')

    return NextResponse.json({ text })
  } catch (error) {
    console.error('Error transcribing voice note:', error)
    return NextResponse.json({ error: 'Failed to transcribe recording' }, { status: 500 })
  }
}
