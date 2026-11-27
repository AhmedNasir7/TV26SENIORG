import { LoginForm } from '@/components/auth/LoginForm'
import { APP_DESCRIPTION, APP_NAME, isSignupOpen } from '@/lib/config'

// Read the sign-up setting on each request, not at build time
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-md space-y-5">
        <div className="text-center">
          <p className="font-display text-lg font-semibold">{APP_NAME}</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{APP_DESCRIPTION}</p>
        </div>
        <LoginForm allowSignup={isSignupOpen()} />
      </main>
    </div>
  )
}
