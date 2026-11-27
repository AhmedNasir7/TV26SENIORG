'use client'

import { CalendarPlus } from 'lucide-react'
import { useFeatures } from '@/hooks/useFeatures'

type Props = { examId: number; title: string; startsAt: string; closesAt: string }

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')

export function AddToCalendar({ examId, title, startsAt, closesAt }: Props) {
  const features = useFeatures()
  const google = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(startsAt)}/${stamp(closesAt)}`,
    details: 'Examination window. Sign in before it closes.',
  })

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <CalendarPlus className="h-4 w-4 text-[color:var(--muted)]" aria-hidden="true" />
      <a href={`https://calendar.google.com/calendar/render?${google}`} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2">
        Add to Google Calendar
      </a>
      <a href={`/api/me/exams/${examId}/calendar`} className="btn-ghost px-3 py-2">Download for other calendars</a>
      {features.calendar && (
        <a href={`/api/calendar/auth?${new URLSearchParams({ title, date: startsAt })}`} className="btn-ghost px-3 py-2">
          Add automatically
        </a>
      )}
    </div>
  )
}
