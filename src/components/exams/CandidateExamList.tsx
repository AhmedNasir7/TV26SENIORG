import Link from 'next/link'
import { LocalTime } from '@/components/ui/LocalTime'
import type { listCandidateExams } from '@/lib/services/access'
import { Countdown } from './Countdown'

type Data = Awaited<ReturnType<typeof listCandidateExams>>

export function CandidateExamList({ title, exams, serverNow, empty }: { title: string; exams: Data['exams']; serverNow: string; empty: string }) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="surface-card mt-3">
        {exams.length === 0 && <li className="p-5 text-sm text-[color:var(--muted)]">{empty}</li>}
        {exams.map((exam) => (
          <li key={exam.id} className="hairline-row flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-medium">{exam.title}</p>
              <p className="text-sm text-[color:var(--muted)]">
                <LocalTime iso={exam.startsAt} /> to <LocalTime iso={exam.access.closesAt} /> · {exam.durationMinutes + exam.extraMinutes} min ·{' '}
                {exam.totalMarks} marks
              </p>
              <p className="text-sm">
                {exam.access.reason}
                {exam.access.state === 'upcoming' && (
                  <> · opens in <Countdown key={serverNow} target={exam.startsAt} serverNow={serverNow} /></>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {exam.resultAvailable && (
                <Link href={`/candidate/exams/${exam.id}/result`} className="btn-primary px-4 py-2 text-sm">View result</Link>
              )}
              <Link href={`/candidate/exams/${exam.id}`} className={`px-4 py-2 text-sm ${exam.access.canEnter ? 'btn-primary' : 'btn-secondary'}`}>
                {exam.access.canEnter ? 'Open' : 'Details'}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
