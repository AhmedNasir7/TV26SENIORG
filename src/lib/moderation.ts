const MODERATION_URL = process.env.MODERATION_SERVICE_URL
const TIMEOUT_MS = 3000

export type ModerationResult = {
  flagged: boolean
  label: string | null
  score: number
}

// Fails open: if the service isn't configured, times out, or errors, the
// message is allowed through. Moderation is a quality feature, not an auth
// gate -- it should never be able to take down chat entirely.
export async function moderateText(text: string): Promise<ModerationResult> {
  if (!MODERATION_URL) {
    return { flagged: false, label: null, score: 0 }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.error('Moderation service returned', res.status)
      return { flagged: false, label: null, score: 0 }
    }

    return await res.json()
  } catch (error) {
    console.error('Moderation service unreachable:', error)
    return { flagged: false, label: null, score: 0 }
  }
}
