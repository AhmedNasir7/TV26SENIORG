import { randomInt } from 'node:crypto'
import { APP_NAME } from '@/lib/config'
import { escapeHtml, getMailer } from '@/lib/server/email'

// No look-alike characters (0/O, 1/l/I), so a password can be read aloud or copied by hand
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function temporaryPassword(length = 14) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

/**
 * Emails a temporary password when email is configured. Email is never required:
 * when it can't be sent, the caller shows the password to the administrator once.
 */
export async function deliverCredentials(email: string, password: string): Promise<boolean> {
  const mailer = getMailer()
  if (!mailer) return false

  try {
    const { error } = await mailer.resend.emails.send({
      from: mailer.from,
      to: email,
      subject: `Your ${APP_NAME} sign-in details`,
      html: `
        <h2>Your ${APP_NAME} account</h2>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Temporary password:</strong> <code>${escapeHtml(password)}</code></p>
        <p>You will be asked to change it when you sign in.</p>
      `,
    })
    if (error) console.error('Credential email failed:', error)
    return !error
  } catch (error) {
    console.error('Credential email failed:', error)
    return false
  }
}
