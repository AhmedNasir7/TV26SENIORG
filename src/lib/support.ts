import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/activity'
import { STAFF_ROLES } from '@/lib/roles'
import { getMailer } from '@/lib/server/email'
import { appUrl, renderEmail, renderText, type EmailContent } from '@/lib/server/email-template'

export async function notifyStaff({
  title,
  message,
  entityId,
}: {
  title: string
  message: string
  entityId?: number
}) {
  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: { id: true },
  })

  await Promise.all(
    staff.map((member) =>
      notifyUser({
        userId: member.id,
        title,
        message,
        type: 'support_message_created',
        entityType: 'support_message',
        entityId,
      })
    )
  )
}

export async function sendSupportResponseEmail({
  to,
  subject,
  originalMessage,
  response,
}: {
  to: string
  subject: string
  originalMessage: string
  response: string
}) {
  const mailer = getMailer()
  if (!mailer) return

  const content: EmailContent = {
    heading: 'We have replied to your support message',
    preheader: response.slice(0, 120),
    paragraphs: [response],
    details: [{ label: 'Your message', value: originalMessage.slice(0, 600) }],
    button: { label: 'Open support', href: `${appUrl()}/support` },
  }
  await mailer.resend.emails.send({ from: mailer.from, to, subject: `Re: ${subject}`, html: renderEmail(content), text: renderText(content) })
}
