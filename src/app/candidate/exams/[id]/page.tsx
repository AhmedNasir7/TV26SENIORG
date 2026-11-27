import Link from 'next/link'
import { ArrowLeft, ScrollText } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import type { ExamPhase } from '@/lib/server/time'
import { Countdown } from '@/components/exams/Countdown'
import { AnnouncementList } from '@/components/attempt/AnnouncementList'
import { RecordedNotice } from '@/components/attempt/RecordedNotice'
import { StartAttemptButton } from '@/components/attempt/StartAttemptButton'
import { AppHeader } from '@/components/layout/AppHeader'
import { LocalTime } from '@/components/ui/LocalTime'
import { requirePageUser } from '@/lib/auth'
import { loadById } from '@/lib/server/page'
import { getCandidateExam } from '@/lib/services/access'

// A candidate's access state shown with the same status glyphs staff see
const PHASE_FOR: Record<string, ExamPhase> = { available: 'ONGOING', in_progress: 'ONGOING', upcoming: 'PUBLISHED', submitted: 'COMPLETED', closed: 'COMPLETED' }

export default async function CandidateExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser(['CANDIDATE'])
  const { exam, serverNow, announcements } = await loadById((await params).id, (id) => getCandidateExam(user, id))

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap max-w-3xl py-8">
        <Link href="/candidate" className="btn-ghost -ml-2 gap-1.5 px-2 py-1 text-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to your examinations
        </Link>
        <div className="page-enter mt-4">
          {PHASE_FOR[exam.access.state] && <StatusPill phase={PHASE_FOR[exam.access.state]} />}
          <h1 className="font-display mt-3 text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">{exam.title}</h1>
        </div>
        <dl className="facts surface-card mt-5 p-5">
          <div><dt>Opens</dt><dd><LocalTime iso={exam.startsAt} /></dd></div>
          <div><dt>Closes for you</dt><dd><LocalTime iso={exam.access.closesAt} /></dd></div>
          <div>
            <dt>Time allowed</dt>
            <dd>{exam.durationMinutes + exam.extraMinutes} minutes{exam.extraMinutes > 0 && ` (includes ${exam.extraMinutes} extra)`}</dd>
          </div>
          <div>
            <dt>Questions and marks</dt>
            <dd>{exam.questionCount} questions · {exam.totalMarks} marks{exam.passMarks !== null && ` · pass ${exam.passMarks}`}</dd>
          </div>
        </dl>
        <section className="surface-card mt-4 p-5">
          <h2 className="font-display flex items-center gap-2 font-semibold">
            <ScrollText className="h-4 w-4 text-[color:var(--muted)]" aria-hidden="true" />
            Instructions
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{exam.instructions || 'No special instructions.'}</p>
          {!exam.allowBackNavigation && <p className="mt-3 text-sm">You cannot go back to earlier questions.</p>}
        </section>
        {exam.access.state !== 'submitted' && exam.access.state !== 'closed' && (
          <section className="surface-card mt-4 p-5 text-sm">
            <h2 className="font-display mb-2 font-semibold">What is recorded</h2>
            <RecordedNotice recorded={exam.recorded} />
          </section>
        )}
        {announcements.length > 0 && (
          <div className="mt-4"><AnnouncementList announcements={announcements} /></div>
        )}
        <section className={`${exam.access.canEnter ? 'glow-card' : 'surface-card'} mt-4 p-5`}>
          <p role="status" className="text-sm font-medium">
            {exam.access.reason}
            {exam.access.state === 'upcoming' && <> · opens in <Countdown key={serverNow} target={exam.startsAt} serverNow={serverNow} /></>}
          </p>
          {exam.resultAvailable && (
            <Link href={`/candidate/exams/${exam.id}/result`} className="btn-primary mt-3 inline-flex px-4 py-2 text-sm">View result</Link>
          )}
          {exam.access.canEnter && (
            <StartAttemptButton examId={exam.id} running={exam.access.state === 'in_progress'} />
          )}
        </section>
      </main>
    </div>
  )
}
