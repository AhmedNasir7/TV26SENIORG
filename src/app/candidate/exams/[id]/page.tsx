import Link from 'next/link'
import { ScrollText } from 'lucide-react'
import { StatusPill } from '@/components/ui/StatusPill'
import type { ExamPhase } from '@/lib/server/time'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CandidateSteps } from '@/components/exams/CandidateSteps'
import { AddToCalendar } from '@/components/exams/AddToCalendar'
import { Countdown } from '@/components/exams/Countdown'
import { CameraGate } from '@/components/live/CameraGate'
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
      <main className="content-wrap py-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Breadcrumbs items={[{ label: 'Your examinations', href: '/candidate' }, { label: exam.title }]} />
          <CandidateSteps current={exam.resultAvailable ? 3 : exam.access.state === 'submitted' ? 2 : exam.access.state === 'in_progress' ? 1 : 0} />
        </div>
        <div className="page-enter mt-10">
          {PHASE_FOR[exam.access.state] && <StatusPill phase={PHASE_FOR[exam.access.state]} />}
          <h1 className="font-display mt-4 text-4xl font-semibold tracking-[-0.02em]">{exam.title}</h1>
        </div>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-6">
            <dl className="facts surface-card p-8">
              <div><dt>Opens</dt><dd><LocalTime iso={exam.startsAt} /></dd></div>
              <div><dt>Closes</dt><dd><LocalTime iso={exam.access.closesAt} /></dd></div>
              <div>
                <dt>Time allowed</dt>
                <dd>{exam.durationMinutes + exam.extraMinutes} minutes{exam.extraMinutes > 0 && ` (${exam.extraMinutes} extra)`}</dd>
              </div>
              <div><dt>Questions</dt><dd>{exam.questionCount}</dd></div>
              <div><dt>Marks</dt><dd>{exam.totalMarks}{exam.passMarks !== null && ` · pass ${exam.passMarks}`}</dd></div>
            </dl>
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="surface-card p-8">
                <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
                  <ScrollText className="h-4 w-4 text-[color:var(--muted)]" aria-hidden="true" />
                  Instructions
                </h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{exam.instructions || 'No special instructions.'}</p>
                {!exam.allowBackNavigation && <p className="mt-4 text-sm font-medium">You cannot go back to earlier questions.</p>}
              </section>
              {exam.access.state !== 'submitted' && exam.access.state !== 'closed' && (
                <section className="surface-card p-8 text-sm leading-7">
                  <h2 className="font-display mb-4 text-lg font-semibold">What is recorded</h2>
                  <RecordedNotice recorded={exam.recorded} live={exam.liveProctor} />
                </section>
              )}
            </div>
            {announcements.length > 0 && <AnnouncementList announcements={announcements} />}
          </div>
          <aside className="order-first space-y-5 lg:sticky lg:top-24 lg:order-none">
            <section className={`${exam.access.canEnter || exam.resultAvailable ? 'glow-card' : 'surface-card'} p-8`}>
              <p role="status" className="font-display text-xl font-semibold">
                {exam.access.reason}
                {exam.access.state === 'upcoming' && <> · opens in <Countdown key={serverNow} target={exam.startsAt} serverNow={serverNow} /></>}
              </p>
              {exam.resultAvailable && (
                <Link href={`/candidate/exams/${exam.id}/result`} className="btn-primary mt-5 inline-flex px-6 py-3 text-sm">View result</Link>
              )}
              {exam.access.canEnter &&
                (exam.liveProctor ? (
                  <CameraGate examId={exam.id}>
                    <StartAttemptButton examId={exam.id} running={exam.access.state === 'in_progress'} />
                  </CameraGate>
                ) : (
                  <StartAttemptButton examId={exam.id} running={exam.access.state === 'in_progress'} />
                ))}
            </section>
            {exam.access.state === 'upcoming' && (
              <AddToCalendar examId={exam.id} title={exam.title} startsAt={exam.startsAt} closesAt={exam.access.closesAt} />
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
