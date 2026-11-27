import { AppHeader } from '@/components/layout/AppHeader'
import { requirePageUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { examPhase, serverNow } from '@/lib/server/time'

const PHASE_LABEL = { PUBLISHED: 'Upcoming', ONGOING: 'Open now', COMPLETED: 'Closed' } as const

export default async function CandidateHomePage() {
  const user = await requirePageUser(['CANDIDATE'])
  const now = serverNow()

  // Only this candidate's enrolments, never drafts, and no question data
  const enrollments = await prisma.enrollment.findMany({
    where: { candidateId: user.id, exam: { status: 'PUBLISHED' } },
    orderBy: { exam: { startsAt: 'asc' } },
    select: {
      id: true,
      exam: { select: { title: true, status: true, startsAt: true, endsAt: true, durationMinutes: true } },
    },
  })

  return (
    <div className="page-shell min-h-screen">
      <AppHeader />
      <main className="content-wrap py-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your examinations</h1>
        {enrollments.length === 0 ? (
          <p className="surface-card mt-6 p-8 text-center text-sm text-[color:var(--muted)]">
            You are not enrolled in any examination yet.
          </p>
        ) : (
          <ul className="surface-card mt-6">
            {enrollments.map(({ id, exam }) => {
              const phase = examPhase(exam, now)
              return (
                <li key={id} className="hairline-row flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-medium">{exam.title}</p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {exam.startsAt.toUTCString()} · {exam.durationMinutes} minutes
                    </p>
                  </div>
                  <span className="chip">{phase === 'DRAFT' ? '' : PHASE_LABEL[phase]}</span>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
