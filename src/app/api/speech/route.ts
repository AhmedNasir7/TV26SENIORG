import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { synthesizeSpeech } from '@/lib/elevenlabs'

const bodySchema = z.object({ text: z.string().trim().min(1).max(1000) })

/** Text to speech for signed-in users. Length is capped to protect the API quota. */
export async function POST(request: NextRequest) {
  try {
    if (!(await getCurrentUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'Narration is not configured' }, { status: 503 })
    }

    const body = bodySchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Provide up to 1000 characters of text' }, { status: 400 })

    const audio = await synthesizeSpeech(body.data.text)
    return new NextResponse(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Speech error:', error)
    return NextResponse.json({ error: 'Failed to generate narration' }, { status: 500 })
  }
}
