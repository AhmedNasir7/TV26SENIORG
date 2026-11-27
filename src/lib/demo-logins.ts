/**
 * Quick-fill buttons on the sign-in page for demonstrations. Server only.
 * They exist only when SHOW_DEMO_LOGINS is "true", because they reveal passwords to anyone who
 * can open the page. Never switch this on where real accounts or data live.
 */
export type DemoLogin = { label: string; email: string; password: string }

const ACCOUNTS = [
  { label: 'Admin', email: 'admin.demo@secureexam.test', passwordVar: 'DEMO_ADMIN_PASSWORD' },
  { label: 'Examiner', email: 'examiner.demo@secureexam.test', passwordVar: 'DEMO_EXAMINER_PASSWORD' },
  { label: 'Candidate', email: 'candidate.demo@secureexam.test', passwordVar: 'DEMO_CANDIDATE_PASSWORD' },
]

export function demoLogins(): DemoLogin[] {
  if (process.env.SHOW_DEMO_LOGINS !== 'true') return []
  return ACCOUNTS.flatMap(({ label, email, passwordVar }) => {
    const password = process.env[passwordVar]
    return password ? [{ label, email, password }] : []
  })
}
