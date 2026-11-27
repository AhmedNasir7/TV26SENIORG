import { randomInt } from 'node:crypto'
import { APP_NAME } from '@/lib/config'
import { getMailer } from '@/lib/server/email'
import { appUrl, renderEmail, renderText, type EmailContent } from '@/lib/server/email-template'

// No look-alike characters (0/O, 1/l/I), so a password can be read aloud or copied by hand
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function temporaryPassword(length = 14) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
}

export type Recipient = { name?: string | null; role?: 'ADMIN' | 'EXAMINER' | 'CANDIDATE'; username?: string | null }

const ROLE_WORDS = { ADMIN: 'an administrator', EXAMINER: 'an examiner', CANDIDATE: 'a candidate' } as const

/** Reserved test domains can't receive mail; sending to them only damages the sender's reputation. */
const unreachable = (email: string) => /\.(test|example|invalid|localhost)$|@example\./.test(email)

/**
 * Emails sign-in details when email is configured. Email is never required:
 * when it can't be sent, the caller shows the password to the administrator once.
 */
export async function deliverCredentials(email: string, password: string, who: Recipient = {}): Promise<boolean> {
  const mailer = getMailer()
  if (!mailer || unreachable(email)) return false

  const link = `${appUrl()}/login`
  const created = Boolean(who.role)
  const content: EmailContent = {
    heading: created ? `Welcome to ${APP_NAME}` : 'Your password was reset',
    preheader: created ? 'Your account is ready. Here are your sign-in details.' : 'Use the temporary password below to sign in.',
    paragraphs: [
      who.name ? `Hello ${who.name},` : 'Hello,',
      created
        ? `An account was created for you${who.role ? ` as ${ROLE_WORDS[who.role]}` : ''}. Use these details to sign in:`
        : 'An administrator reset your password. Use these details to sign in:',
    ],
    details: [
      { label: 'Email', value: email },
      ...(who.username ? [{ label: 'Username', value: who.username }] : []),
      { label: 'Temporary password', value: password, mono: true },
    ],
    button: { label: `Sign in to ${APP_NAME}`, href: link },
    note: 'You will be asked to choose a new password the first time you sign in. Keep this email private.',
  }
  try {
    const { error } = await mailer.resend.emails.send({
      from: mailer.from,
      to: email,
      subject: created ? `Your ${APP_NAME} account is ready` : `Your ${APP_NAME} password was reset`,
      html: renderEmail(content),
      text: renderText(content),
    })
    if (error) console.error('Credential email failed:', error)
    return !error
  } catch (error) {
    console.error('Credential email failed:', error)
    return false
  }
}

/** For bulk imports: one email each, spaced to stay under the provider's rate limit. */
export async function deliverCredentialsBatch(accounts: Array<{ email: string; password: string; name?: string | null }>) {
  for (const account of accounts) {
    await deliverCredentials(account.email, account.password, { name: account.name, role: 'CANDIDATE' })
    await new Promise((resolve) => setTimeout(resolve, 550))
  }
}
