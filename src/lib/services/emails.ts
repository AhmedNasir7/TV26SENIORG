/**
 * Email through Resend. Always optional: in-app notifications are the record, and a failure here never
 * breaks the action that triggered it. Each batch is capped to protect the sending quota.
 */
import { APP_NAME } from '@/lib/config'
import { prisma } from '@/lib/prisma'
import { getMailer } from '@/lib/server/email'
import { appUrl, renderEmail, renderText, type EmailContent } from '@/lib/server/email-template'

const MAX_PER_BATCH = 60

export async function emailUsers(userIds: number[], subject: string, message: string) {
  const mailer = getMailer()
  if (!mailer || !userIds.length) return 0
  const people = await prisma.user.findMany({
    where: { id: { in: userIds.slice(0, MAX_PER_BATCH) }, status: 'ACTIVE' },
    select: { email: true },
  })
  const content: EmailContent = {
    heading: subject,
    preheader: message,
    paragraphs: [message],
    button: { label: `Open ${APP_NAME}`, href: `${appUrl()}/login` },
  }
  const html = renderEmail(content)
  const text = renderText(content)
  let sent = 0
  for (const person of people) {
    // Reserved test domains can't receive mail; sending to them only damages the sender's reputation
    if (/\.(test|example|invalid|localhost)$|@example\./.test(person.email)) continue
    try {
      const { error } = await mailer.resend.emails.send({ from: mailer.from, to: person.email, subject: `${APP_NAME}: ${subject}`, html, text })
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
