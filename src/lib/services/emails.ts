/**
 * Email through Resend. Always optional: in-app notifications are the record, and a failure here never
 * breaks the action that triggered it. Each batch is capped to protect the sending quota.
 */
import { APP_NAME } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { escapeHtml, getMailer } from '@/lib/server/email'
import { runtimeEnv } from '@/lib/server/runtime-env'

const MAX_PER_BATCH = 60

export async function emailUsers(userIds: number[], subject: string, message: string) {
  const mailer = getMailer()
  if (!mailer || !userIds.length) return 0
  const people = await prisma.user.findMany({
    where: { id: { in: userIds.slice(0, MAX_PER_BATCH) }, status: 'ACTIVE' },
    select: { email: true },
  })
  const link = `${runtimeEnv('NEXT_PUBLIC_APP_URL') ?? ''}/login`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#101828">
  <h2 style="margin:0 0 8px">${escapeHtml(subject)}</h2>
  <p>${escapeHtml(message)}</p>
  <p><a href="${escapeHtml(link)}">Open ${escapeHtml(APP_NAME)}</a></p>
</div>`
  let sent = 0
  for (const person of people) {
    // Reserved test domains can't receive mail; sending to them only damages the sender's reputation
    if (/\.(test|example|invalid|localhost)$|@example\./.test(person.email)) continue
    try {
      const { error } = await mailer.resend.emails.send({ from: mailer.from, to: person.email, subject: `${APP_NAME}: ${subject}`, html })
      if (!error) sent += 1
    } catch (error) {
      console.error('Email failed:', error instanceof Error ? error.message : error)
    }
    await new Promise((resolve) => setTimeout(resolve, 550)) // stays under the provider's rate limit
  }
  return sent
}

/** Fire and forget, for actions that shouldn't wait for email. */
export const emailLater = (userIds: number[], subject: string, message: string) => {
  void emailUsers(userIds, subject, message).catch((error) => console.error('Email batch failed:', error))
}
