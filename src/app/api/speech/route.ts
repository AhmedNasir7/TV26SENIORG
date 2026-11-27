import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { synthesizeSpeech } from '@/lib/elevenlabs'
import { rateLimit } from '@/lib/server/rate-limit'

// Narration of the same text is reused, so a repeated press costs nothing
const spoken = new Map<string, Buffer>()

const bodySchema = z.object({ text: z.string().trim().min(1).max(1000) })

/** Text to speech for signed-in users. Length is capped to protect the API quota. */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'Narration is not configured' }, { status: 503 })
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Provide up to 1000 characters of text' }, { status: 400 })

    let audio = spoken.get(body.data.text)
    if (!audio) {
      try {
        rateLimit(`speech:${user.id}`, 15, 60_000)
      } catch {
        return NextResponse.json({ error: 'Too many requests. Wait a moment.' }, { status: 429 })
      }
      audio = await synthesizeSpeech(body.data.text)
      if (spoken.size >= 200) spoken.delete(spoken.keys().next().value!)
      spoken.set(body.data.text, audio)
    }
    return new NextResponse(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Speech error:', error)
    return NextResponse.json({ error: 'Failed to generate narration' }, { status: 500 })
  }
}
