import { redirect } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'
import { APP_NAME, isSignupOpen } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  if (!isSignupOpen()) redirect('/login')

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-md space-y-5">
        <p className="font-display text-center text-lg font-semibold">{APP_NAME}</p>
        <SignupForm />
      </main>
    </div>
  )
}
