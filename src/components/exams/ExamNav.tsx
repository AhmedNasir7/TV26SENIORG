'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { examSteps, nextAction, type FlowInput } from '@/lib/exam-flow'

type Props = { exam: FlowInput & { title: string } }

/** Shown above every page of one examination: breadcrumbs, the numbered path and the next step. */
export function ExamNav({ exam }: Props) {
  const pathname = usePathname()
  const base = `/examiner/exams/${exam.id}`
  const steps = examSteps(exam)
  // A candidate's paper belongs to the results step
  const current = pathname.startsWith(`${base}/attempts`)
    ? 'results'
    : (steps.find((s) => s.href !== base && pathname.startsWith(s.href))?.key ?? 'details')
  const next = nextAction(exam)
  const here = steps.find((s) => s.key === current)!
  const onNextPage = next.href.split('#')[0] === pathname

  return (
    <div className="space-y-4 px-8 pt-6">
      <Breadcrumbs
        items={[
          { label: 'Examinations', href: '/examiner' },
          { label: exam.title, href: base },
          ...(pathname === base ? [] : [{ label: pathname.startsWith(`${base}/attempts`) ? 'Candidate paper' : here.label }]),
        ]}
      />

      <nav aria-label="Examination steps">
        <ol className="surface-card flex flex-wrap gap-2 p-2">
          {steps.map((step, index) => {
            const active = step.key === current
            const content = (
              <>
                <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current text-[11px] tabular-nums">
                  {step.locked ? <Lock className="h-3 w-3" /> : step.done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                {step.label}
                <span className="sr-only">{step.locked ? ` (${step.locked})` : step.done ? ' (done)' : ''}</span>
              </>
            )
            const shape = 'inline-flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm'
            return (
              <li key={step.key}>
                {step.locked ? (
                  <span title={step.locked} aria-disabled="true" className={`${shape} cursor-not-allowed text-[color:var(--muted)] opacity-70`}>
                    {content}
                  </span>
                ) : (
                  <Link href={step.href} aria-current={active ? 'step' : undefined} className={`${shape} ${active ? 'btn-primary' : 'btn-secondary'}`}>
                    {content}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {current !== 'sandbox' && (
      <div className="glow-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium opacity-70">Next step</p>
          <p className="font-medium">{next.title}</p>
          <p className="text-sm opacity-80">{next.help}</p>
        </div>
        {(!onNextPage || next.href.includes('#')) && (
          <Link href={next.href} className="btn-primary px-4 py-2 text-sm">
            {next.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      )}
    </div>
  )
}
