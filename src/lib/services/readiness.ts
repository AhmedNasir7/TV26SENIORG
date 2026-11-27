/** The publication checklist. Pure, so the screen and the publish action can't disagree. */
import { roundMarks } from '@/lib/grading'

export type Check = { label: string; ok: boolean; blocking: boolean }

export function publicationChecks(exam: {
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  totalMarks: number
  questionMarks: number[]
  enrolled: number
  now: Date
}): Check[] {
  const sum = roundMarks(exam.questionMarks.reduce((total, marks) => total + marks, 0))
  const opensFrom = Math.max(exam.now.getTime(), exam.startsAt.getTime())
  return [
    { label: 'Has at least one question', ok: exam.questionMarks.length > 0, blocking: true },
    {
      label: `Question marks (${sum}) equal the total marks (${exam.totalMarks})`,
      ok: sum === exam.totalMarks,
      blocking: true,
    },
    { label: 'The end time is in the future', ok: exam.endsAt > exam.now, blocking: true },
    { label: 'The start time has not passed', ok: exam.startsAt > exam.now, blocking: false },
    {
      label: 'A candidate starting at opening time gets the full duration',
      ok: exam.endsAt.getTime() - opensFrom >= exam.durationMinutes * 60_000,
      blocking: false,
    },
    { label: `Candidates are enrolled (${exam.enrolled})`, ok: exam.enrolled > 0, blocking: false },
  ]
}
