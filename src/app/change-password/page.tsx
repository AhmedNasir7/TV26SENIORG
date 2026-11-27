import { redirect } from 'next/navigation'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { getSession } from '@/lib/auth'

export default async function ChangePasswordPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
      <main className="w-full max-w-md">
        <ChangePasswordForm forced={user.mustChangePassword} />
      </main>
    </div>
  )
}
