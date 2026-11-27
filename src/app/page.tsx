import { redirect } from 'next/navigation'
import { requirePageUser } from '@/lib/auth'
import { HOME_PATH } from '@/lib/home-path'

/** Entry point: send each visitor to the home page for their role. */
export default async function Home() {
  const user = await requirePageUser()
  redirect(HOME_PATH[user.role])
}
