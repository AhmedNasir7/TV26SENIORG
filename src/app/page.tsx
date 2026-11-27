import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Landing } from '@/components/landing/Landing'
import { getSession, requirePageUser } from '@/lib/auth'
import { HOME_PATH } from '@/lib/home-path'

export const metadata: Metadata = { title: 'Invigil: online examinations you can trust' }

/** Visitors see the front page; signed-in people go to the home page for their role. */
export default async function Home() {
  if (!(await getSession())) return <Landing />
  const user = await requirePageUser()
  redirect(HOME_PATH[user.role])
}
