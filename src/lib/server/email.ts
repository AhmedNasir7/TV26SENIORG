import { Resend } from 'resend'

/** Null when email isn't configured, so features can fall back instead of failing. */
export function getMailer() {
  const key = process.env.RESEND_SECRET_KEY
  if (!key) return null
  return {
    resend: new Resend(key),
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)
}
