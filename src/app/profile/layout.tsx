import { requirePageUser } from '@/lib/auth'

export default async function GuardedLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser()
  return children
}
