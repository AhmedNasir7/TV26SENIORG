/**
 * The path through one examination: which steps are done, which can be opened yet, and the single
 * most useful thing to do next. Pure, so tests can use it.
 */
export type FlowInput = {
  id: number
  phase: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED'
  questions: number
  enrolled: number
  /** publication requirements that still fail */
  blockers: number
  attempts: number
  awaitingMarking: number
  resultsPublished: boolean
}

export type FlowStep = {
  key: 'details' | 'questions' | 'candidates' | 'sandbox' | 'monitor' | 'grading' | 'results'
  label: string
  href: string
  done: boolean
  /** why it can't be opened yet; the step stays visible either way */
  locked?: string
}

export function examSteps(exam: FlowInput): FlowStep[] {
  const base = `/examiner/exams/${exam.id}`
  const draft = exam.phase === 'DRAFT'
  const notStarted = draft || exam.phase === 'PUBLISHED'
  const afterStart = notStarted ? 'Available once the examination opens' : undefined

  return [
    { key: 'details', label: draft ? 'Details and publish' : 'Details', href: base, done: !draft },
    { key: 'questions', label: 'Questions', href: `${base}/questions`, done: exam.questions > 0 },
    { key: 'candidates', label: 'Candidates', href: `${base}/candidates`, done: exam.enrolled > 0 },
    {
      key: 'sandbox',
      label: 'Try it',
      href: `${base}/sandbox`,
      done: false,
      locked: exam.questions ? undefined : 'Add questions first',
    },
    { key: 'monitor', label: draft ? 'Monitoring rules' : 'Monitor', href: `${base}/monitor`, done: exam.phase === 'COMPLETED' },
    {
      key: 'grading',
      label: 'Marking',
      href: `${base}/grading`,
      done: exam.phase === 'COMPLETED' && exam.attempts > 0 && exam.awaitingMarking === 0,
      locked: afterStart,
    },
    { key: 'results', label: 'Results', href: `${base}/results`, done: exam.resultsPublished, locked: afterStart },
  ]
}

export function nextAction(exam: FlowInput): { title: string; help: string; label: string; href: string } {
  const base = `/examiner/exams/${exam.id}`
  const go = (title: string, help: string, label: string, path = '') => ({ title, help, label, href: base + path })

  if (exam.phase === 'DRAFT') {
    if (!exam.questions) return go('Add questions', 'Pick questions from your bank and set their marks.', 'Add questions', '/questions')
    if (!exam.enrolled) return go('Enrol candidates', 'Choose who can sit this examination.', 'Enrol candidates', '/candidates')
    if (exam.blockers) return go('Finish the checklist', 'Some publication requirements are not met yet.', 'See the checklist', '#publish')
    return go('Ready to publish', 'Try it in the sandbox if you like, then publish.', 'Review and publish', '#publish')
  }
  if (exam.phase === 'PUBLISHED') {
    return go('Waiting to open', 'Candidates can see it. Check the candidate list and monitoring rules.', 'Check candidates', '/candidates')
  }
  if (exam.phase === 'ONGOING') {
    return go('Examination in progress', 'Follow progress and send announcements.', 'Open the live board', '/monitor')
  }
  if (exam.awaitingMarking) {
    return go('Marking needed', `${exam.awaitingMarking} attempts have written answers to mark.`, 'Mark answers', '/grading')
  }
  if (!exam.attempts) return go('Examination closed', 'Nobody submitted an attempt.', 'View results', '/results')
  if (!exam.resultsPublished) return go('Ready for results', 'Check the scores, then publish them to candidates.', 'Publish results', '/results')
  return go('Results published', 'Candidates can see their scores and feedback.', 'View results', '/results')
}
