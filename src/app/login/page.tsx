import { AuthShell } from '@/components/auth/AuthShell'
import { LoginForm } from '@/components/auth/LoginForm'
import { demoLogins } from '@/lib/demo-logins'

// Read the settings on each request, not at build time
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <AuthShell title="Welcome" accent="back" subtitle="Sign in with the account your administrator gave you.">
      <LoginForm demoAccounts={demoLogins()} />
    </AuthShell>
  )
}
