import { ArrowRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LocalTime } from '@/components/ui/LocalTime'
import type { listCandidateExams } from '@/lib/services/access'
import { Countdown } from './Countdown'

type Data = Awaited<ReturnType<typeof listCandidateExams>>
type Exam = Data['exams'][number]

/** The one time that matters for this card: when it closes, opens, or took place. */
function When({ exam, serverNow }: { exam: Exam; serverNow: string }) {
  if (exam.access.canEnter) return <>Closes <LocalTime iso={exam.access.closesAt} /></>
  if (exam.access.state === 'upcoming') {
    return <>Opens <LocalTime iso={exam.startsAt} /> · in <Countdown key={serverNow} target={exam.startsAt} serverNow={serverNow} /></>
  }
  return <LocalTime iso={exam.startsAt} />
}

export function CandidateExamList({ title, exams, serverNow, empty }: { title: string; exams: Data['exams']; serverNow: string; empty: string }) {
  return (
    <section aria-label={title} className="mt-12 first:mt-0">
      <h2 className="font-display flex items-center gap-3 text-lg font-semibold">
        {title}
        <span className="segmented-count">{exams.length}</span>
      </h2>
      {exams.length === 0 && <p className="mt-4 text-sm text-[color:var(--muted)]">{empty}</p>}
      <ul className="mt-5 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {exams.map((exam) => (
          <li key={exam.id} className="surface-card flex flex-col gap-6 p-7 transition-transform duration-300 hover:-translate-y-1">
            <div>
              {exam.access.canEnter && (
                <span className="badge-highlight mb-3">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
                  {exam.access.state === 'in_progress' ? 'In progress' : 'Open now'}
                </span>
              )}
              <p className="font-display text-xl font-semibold">{exam.title}</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                <When exam={exam} serverNow={serverNow} />
              </p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {exam.durationMinutes + exam.extraMinutes} minutes · {exam.totalMarks} marks
              </p>
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              {exam.resultAvailable && (
                <Link href={`/candidate/exams/${exam.id}/result`} className="btn-primary px-5 py-2.5 text-sm">View result<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              )}
              <Link href={`/candidate/exams/${exam.id}`} className={`px-5 py-2.5 text-sm ${exam.access.canEnter ? 'btn-primary' : 'btn-secondary'}`}>
                {exam.access.canEnter ? 'Open' : 'Details'}
                {exam.access.canEnter ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
