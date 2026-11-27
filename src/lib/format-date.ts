/**
 * Short dates for people: "27 Nov, 10:19 AM". No time-zone suffix; the year only when it differs.
 * In the browser the viewer's own zone applies. Server-written text (emails, PDF files) passes
 * SERVER_ZONE so it doesn't read in UTC.
 */
export const SERVER_ZONE = 'Asia/Karachi'

export function formatDate(value: Date | string, timeZone?: string) {
  const date = new Date(value)
  const year = date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year, timeZone })
}

export const formatTime = (value: Date | string, timeZone?: string) =>
  new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })

export const formatDateTime = (value: Date | string, timeZone?: string) =>
  `${formatDate(value, timeZone)}, ${formatTime(value, timeZone)}`
