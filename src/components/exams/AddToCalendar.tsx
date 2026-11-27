'use client'

import { CalendarPlus } from 'lucide-react'
import { useState } from 'react'
import { useFeatures } from '@/hooks/useFeatures'
import { apiRequest } from '@/lib/client/request'

type Props = { examId: number; title: string; startsAt: string; closesAt: string; reminderMinutes: number | null }

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')
const CHOICES = [10, 30, 60, 180, 1440, 2880]
const label = (minutes: number) =>
  minutes >= 1440 ? `${minutes / 1440} day${minutes > 1440 ? 's' : ''} before` : minutes >= 60 ? `${minutes / 60} hour${minutes > 60 ? 's' : ''} before` : `${minutes} minutes before`

export function AddToCalendar({ examId, title, startsAt, closesAt, reminderMinutes }: Props) {
  const features = useFeatures()
  const [minutes, setMinutes] = useState<number | null>(reminderMinutes)
  const [note, setNote] = useState('')
  const google = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(startsAt)}/${stamp(closesAt)}`,
    details: 'Examination window. Sign in before it closes.',
  })

  async function choose(value: string) {
    const next = value ? Number(value) : null
    setMinutes(next)
    try {
      await apiRequest(`/api/me/exams/${examId}/reminder`, 'PUT', { minutes: next })
      setNote(next ? 'Saved. You will get an email then, and the calendar file includes it.' : 'Reminder removed.')
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not save the reminder')
    }
  }

  return (
    <div className="surface-card space-y-4 p-6 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <CalendarPlus className="h-4 w-4 text-[color:var(--muted)]" aria-hidden="true" /> Calendar and reminder
      </div>
      <label className="block">
        <span className="mb-1 block font-medium">Remind me</span>
        <select value={minutes ?? ''} onChange={(event) => void choose(event.target.value)} className="w-full">
          <option value="">Only the standard reminders</option>
          {CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {label(choice)}
            </option>
          ))}
        </select>
      </label>
      {note && (
        <p role="status" className="text-[color:var(--muted)]">
          {note}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <a href={`https://calendar.google.com/calendar/render?${google}`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2">
          Add to Google Calendar
        </a>
        <a href={`/api/me/exams/${examId}/calendar`} className="btn-ghost px-3 py-2">
          Download for other calendars
        </a>
        {features.calendar && (
          <a href={`/api/calendar/auth?${new URLSearchParams({ title, date: startsAt, remind: String(minutes ?? 60) })}`} className="btn-ghost px-3 py-2">
            Add automatically
          </a>
        )}
      </div>
    </div>
  )
}
