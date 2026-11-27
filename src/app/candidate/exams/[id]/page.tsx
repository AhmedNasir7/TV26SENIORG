import Link from 'next/link'
import { Countdown } from '@/components/exams/Countdown'
import { StartAttemptButton } from '@/components/attempt/StartAttemptButton'
import { AppHeader } from '@/components/layout/AppHeader'
import { LocalTime } from '@/components/ui/LocalTime'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { getCandidateExam } from '@/lib/services/access'

export default async function CandidateExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  const { exam, serverNow } = await loadById((await params).id, (id) => getCandidateExam(user, id))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap max-w-3xl py-8">
        <Link href="/candidate" className="link-accent text-sm">Back to your examinations</Link>
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">{exam.title}</h1>
        <dl className="surface-card mt-5 grid gap-3 p-5 text-sm sm:grid-cols-2">
          <div><dt className="text-[color:var(--muted)]">Opens</dt><dd><LocalTime iso={exam.startsAt} /></dd></div>
          <div><dt className="text-[color:var(--muted)]">Closes for you</dt><dd><LocalTime iso={exam.access.closesAt} /></dd></div>
          <div>
            <dt className="text-[color:var(--muted)]">Time allowed</dt>
            <dd>{exam.durationMinutes + exam.extraMinutes} minutes{exam.extraMinutes > 0 && ` (includes ${exam.extraMinutes} extra)`}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--muted)]">Questions and marks</dt>
            <dd>{exam.questionCount} questions · {exam.totalMarks} marks{exam.passMarks !== null && ` · pass ${exam.passMarks}`}</dd>
          </div>
        </dl>
        <section className="surface-card mt-4 p-5">
          <h2 className="font-display font-semibold">Instructions</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{exam.instructions || 'No special instructions.'}</p>
          {!exam.allowBackNavigation && <p className="mt-3 text-sm">You cannot go back to earlier questions.</p>}
        </section>
        <p role="status" className="mt-5 text-sm font-medium">
          {exam.access.reason}
          {exam.access.state === 'upcoming' && <> · opens in <Countdown key={serverNow} target={exam.startsAt} serverNow={serverNow} /></>}
        </p>
        {exam.access.canEnter && (
          <StartAttemptButton examId={exam.id} running={exam.access.state === 'in_progress'} />
        )}
      </main>
    </div>
  )
}
