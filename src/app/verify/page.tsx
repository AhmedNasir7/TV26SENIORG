import { redirect } from 'next/navigation'
import { BrandMark } from '@/components/layout/BrandMark'

export const metadata = { title: 'Verify a result report' }

export default async function VerifyHome({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = (await searchParams).code?.trim()
  if (code) redirect(`/verify/${encodeURIComponent(code)}`)

  return (
    <main className="page-shell grid min-h-screen place-items-center p-6">
      <div className="surface-card w-full max-w-md p-8">
        <BrandMark />
        <h1 className="font-display mt-6 text-2xl font-semibold">Verify a result report</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Scan the code on the report, or type it here.</p>
        <form method="get" className="mt-5 space-y-3">
          <input name="code" required maxLength={40} aria-label="Verification code" placeholder="Verification code" className="input-clean w-full px-3 py-3 font-mono uppercase" />
          <button type="submit" className="btn-primary w-full px-4 py-3 text-sm">Check</button>
        </form>
      </div>
    </main>
  )
}
