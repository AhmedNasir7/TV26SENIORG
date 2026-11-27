import { randomInt } from 'node:crypto'
import { APP_NAME } from '@/lib/config'
import { escapeHtml, getMailer } from '@/lib/server/email'
import { runtimeEnv } from '@/lib/server/runtime-env'

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

  const link = `${runtimeEnv('NEXT_PUBLIC_APP_URL') ?? ''}/login`
  const greeting = who.name ? `Hello ${escapeHtml(who.name)},` : 'Hello,'
  const role = who.role ? ` as ${ROLE_WORDS[who.role]}` : ''
  try {
    const { error } = await mailer.resend.emails.send({
      from: mailer.from,
      to: email,
      subject: `Your ${APP_NAME} sign-in details`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#101828">
        <h2 style="margin:0 0 8px">Welcome to ${escapeHtml(APP_NAME)}</h2>
        <p>${greeting}</p>
        <p>An account was created for you${role}. Sign in with:</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}<br>
        ${who.username ? `<strong>Username:</strong> ${escapeHtml(who.username)}<br>` : ''}
        <strong>Temporary password:</strong> <code>${escapeHtml(password)}</code></p>
        <p>You will be asked to choose a new password the first time you sign in.</p>
        <p><a href="${escapeHtml(link)}">Sign in to ${escapeHtml(APP_NAME)}</a></p>
      </div>`,
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
