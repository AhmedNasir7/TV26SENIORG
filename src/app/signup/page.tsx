import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '@/components/auth/SignupForm'
import { isSignupOpen } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <AuthShell title="Set up your" accent="console" subtitle="For administrators. Examiners and candidates receive their accounts from you.">
      <SignupForm open={isSignupOpen()} />
    </AuthShell>
  )
}
