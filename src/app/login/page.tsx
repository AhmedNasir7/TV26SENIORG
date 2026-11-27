import { LoginForm } from '@/components/auth/LoginForm'
import { LoginShowcase } from '@/components/auth/LoginShowcase'
import { BrandMark } from '@/components/layout/BrandMark'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { APP_DESCRIPTION, isSignupOpen } from '@/lib/config'
import { demoLogins } from '@/lib/demo-logins'

// Read the sign-up setting on each request, not at build time
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <header className="content-wrap flex h-16 w-full items-center justify-between">
        <BrandMark />
        <ThemeToggle />
      </header>
      <div className="content-wrap grid w-full flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-16">
        <main className="w-full space-y-6">
          <div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
              Examinations, <span className="mark-highlight">secured</span>.
            </h1>
            <p className="mt-3 text-[15px] text-[color:var(--muted)]">{APP_DESCRIPTION}</p>
          </div>
          <LoginForm allowSignup={isSignupOpen()} demoAccounts={demoLogins()} />
        </main>
        <LoginShowcase />
      </div>
    </div>
  )
}
