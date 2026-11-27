import { google } from 'googleapis'
import { runtimeEnv } from '@/lib/server/runtime-env'

const appUrl = () => runtimeEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'

export function createOAuthClient() {
  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return new google.auth.OAuth2(clientId, clientSecret, `${appUrl()}/api/calendar/callback`)
}

export type CalendarRequest = { title: string; date: string }

/** Reads the event details from untrusted query or state values. */
export function parseCalendarRequest(title: string | null, date: string | null): CalendarRequest {
  const parsed = date ? new Date(date) : null
  const start = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date(Date.now() + 60 * 60 * 1000)
  return { title: title?.trim().slice(0, 200) || 'Examination', date: start.toISOString() }
}

export async function addCalendarEvent(
  auth: NonNullable<ReturnType<typeof createOAuthClient>>,
  { title, date }: CalendarRequest
) {
  const start = new Date(date)
  const end = new Date(start.getTime() + 60 * 60 * 1000)

  await google.calendar({ version: 'v3', auth }).events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: 'UTC' },
      end: { dateTime: end.toISOString(), timeZone: 'UTC' },
    },
  })
}
