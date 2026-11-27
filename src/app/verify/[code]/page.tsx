import { BadgeCheck, CircleAlert, CircleX } from 'lucide-react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { BrandMark } from '@/components/layout/BrandMark'
import { LocalTime } from '@/components/ui/LocalTime'
import { rateLimit } from '@/lib/server/rate-limit'
import { verifyCode, type Verdict } from '@/lib/services/verification'

export const metadata = { title: 'Report verification' }

const TEXT: Record<Verdict, { title: string; help: string }> = {
  valid: { title: 'Genuine and current', help: 'This report matches the result on record.' },
  superseded: { title: 'Superseded', help: 'The result changed, or a newer report was issued. Ask for the current one.' },
  withdrawn: { title: 'Withdrawn', help: 'The examination results are withdrawn for review.' },
  revoked: { title: 'Revoked', help: 'This report is no longer accepted.' },
  invalid: { title: 'Cannot be trusted', help: 'The stored record fails its signature check.' },
  unknown: { title: 'Not found', help: 'No report has this code.' },
}

export default async function VerifyCodePage({ params }: { params: Promise<{ code: string }> }) {
  const address = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
  let result: Awaited<ReturnType<typeof verifyCode>> | null = null
  try {
    rateLimit(`verify:${address}`, 30, 60_000)
    result = await verifyCode((await params).code)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith('Too many')) throw error
  }
  const verdict = result?.verdict
  const Icon = verdict === 'valid' ? BadgeCheck : verdict === 'superseded' || verdict === 'withdrawn' ? CircleAlert : CircleX

  return (
    <main className="page-shell grid min-h-screen place-items-center p-6">
      <div className="surface-card w-full max-w-md p-8" role="status">
        <BrandMark />
        {!verdict ? (
          <p className="mt-6">Too many checks from this address. Wait a minute and try again.</p>
        ) : (
          <>
            <Icon className="mt-6 h-12 w-12" aria-hidden="true" style={{ color: verdict === 'valid' ? 'var(--success)' : 'var(--danger)' }} />
            <h1 className="font-display mt-3 text-2xl font-semibold">{TEXT[verdict].title}</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{TEXT[verdict].help}</p>
            {result && 'exam' in result && (
              <dl className="facts mt-6 text-sm">
                <div><dt>Examination</dt><dd>{result.exam}</dd></div>
                <div><dt>Candidate</dt><dd>{result.candidate}</dd></div>
                <div><dt>Score on this report</dt><dd>{result.score ?? '-'} / {result.maximum}</dd></div>
                <div><dt>Issued</dt><dd><LocalTime iso={result.issuedAt!} /></dd></div>
              </dl>
            )}
          </>
        )}
        <Link href="/verify" className="btn-secondary mt-6 inline-flex px-4 py-2 text-sm">Check another code</Link>
      </div>
    </main>
  )
}
