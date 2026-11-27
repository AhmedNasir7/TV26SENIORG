import { ConsoleShell } from '@/components/layout/ConsoleShell'
import { requirePageUser } from '@/lib/auth'
import { STAFF_ROLES } from '@/lib/roles'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { id, email, role } = await requirePageUser(STAFF_ROLES)
  return <ConsoleShell user={{ id, email, role }}>{children}</ConsoleShell>
}
