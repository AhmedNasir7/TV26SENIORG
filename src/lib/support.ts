import { prisma } from '@/lib/prisma'
import { notifyUser } from '@/lib/activity'
import { STAFF_ROLES } from '@/lib/roles'
import { escapeHtml, getMailer } from '@/lib/server/email'

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

  await mailer.resend.emails.send({
    from: mailer.from,
    to,
    subject: `Re: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>We've responded to your support message</h2>
        <p>${escapeHtml(response).replace(/\n/g, '<br>')}</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 13px;">Your original message:</p>
        <p style="color: #6b7280; font-size: 13px; white-space: pre-wrap;">${escapeHtml(originalMessage)}</p>
      </div>
    `,
  })
}
