/** Words and pictures of the public landing page. Every statement here describes a working feature. */
export const shot = (name: string, theme: 'light' | 'dark') => `/landing/${name}${theme === 'dark' ? '-dark' : ''}.webp`

export const scenes = [
  { id: 'workspace', label: 'Examinations' },
  { id: 'attempt', label: 'Taking it' },
  { id: 'monitor', label: 'Live monitor' },
  { id: 'results', label: 'Results' },
  { id: 'fair', label: 'Fair papers' },
]

export const hero = {
  pill: 'Every result carries a code anyone can verify',
  title: 'Examinations you can trust',
  subtitle: 'Create, run, monitor and grade online examinations. The server keeps the clock and every change is recorded.',
}

export const articles = [
  {
    id: 'author',
    tab: 'Question bank',
    title: 'Write once, reuse safely.',
    muted: 'Versioned questions, bulk import and AI drafts that you approve one by one.',
    image: 'questions',
  },
  {
    id: 'fairness',
    tab: 'Fair papers',
    title: 'Different papers, same difficulty.',
    muted: 'A blueprint draws each paper and shows the evidence from two hundred sample draws.',
    image: 'fair',
  },
  {
    id: 'taking',
    tab: 'Taking it',
    title: 'Calm for the candidate.',
    muted: 'Answers save as they go, survive a lost connection, and a scratchpad sits one press away.',
    image: 'scratchpad',
  },
  {
    id: 'watching',
    tab: 'Monitoring',
    title: 'See who needs help.',
    muted: 'You choose the indicators. Candidates are told what is recorded. Nothing changes a score.',
    image: 'monitor',
  },
  {
    id: 'marking',
    tab: 'Results',
    title: 'Mark, publish, prove.',
    muted: 'Objective answers mark themselves, written ones wait for you, and reports are signed.',
    image: 'results',
  },
]

export const events = [
  { at: '10:04', what: 'Left the examination tab', detail: '6 seconds' },
  { at: '10:11', what: 'Connection lost', detail: '41 seconds' },
  { at: '10:12', what: 'Reconnected, answers saved', detail: '3 waiting answers sent' },
  { at: '10:20', what: 'Examiner note', detail: 'Network issue, no action' },
]

export const stats = [
  { value: '3', label: 'roles, checked on every request' },
  { value: '8', label: 'monitoring indicators you control' },
  { value: '200', label: 'sample papers behind each fairness check' },
  { value: '0', label: 'trust placed in the device clock' },
]

export const roles = [
  { title: 'Examiners', body: 'Build, publish, watch and mark in one flow with a numbered step bar.', image: 'workspace' },
  { title: 'Candidates', body: 'One clear next action, a server timer and a result they can download.', image: 'candidate' },
  { title: 'Anyone else', body: 'Employers and institutions check a result code without an account.', image: 'result' },
]

export const steps = [
  { when: 'Step 1', title: 'Prepare', body: 'Import or write questions, set the blueprint and assign candidates.' },
  { when: 'Step 2', title: 'Run', body: 'Reminders go out, the window opens and the server keeps time.' },
  { when: 'Step 3', title: 'Review', body: 'Mark written answers and look at the records, with AI help if you ask.' },
  { when: 'Step 4', title: 'Publish', body: 'Candidates are told, disputes are handled and reports can be verified.' },
]
