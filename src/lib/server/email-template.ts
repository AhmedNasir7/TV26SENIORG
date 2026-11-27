/**
 * The one look of every email the app sends: the Invigil mark on a dark band, a lime accent, a white
 * card with the message, one clear button and a quiet footer. Table layout and inline styles only,
 * because mail clients ignore everything else. All text passed in is escaped here.
 */
import { APP_NAME } from '@/lib/config'
import { escapeHtml } from '@/lib/server/email'
import { runtimeEnv } from '@/lib/server/runtime-env'

const INK = '#101828'
const MUTED = '#667085'
const DARK = '#17181c'
const LIME = '#e4f222'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export const appUrl = () => (runtimeEnv('NEXT_PUBLIC_APP_URL') ?? '').replace(/\/$/, '')

export type EmailContent = {
  /** the big line at the top of the card */
  heading: string
  /** the grey line some inboxes show beside the subject */
  preheader?: string
  /** plain paragraphs; line breaks are kept */
  paragraphs?: string[]
  /** a small table of facts, e.g. Email / Temporary password */
  details?: Array<{ label: string; value: string; mono?: boolean }>
  button?: { label: string; href: string }
  /** a line under the button, e.g. "You will be asked to change it" */
  note?: string
}

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK};">${escapeHtml(text).replace(/\n/g, '<br>')}</p>`

export function renderEmail({ heading, preheader, paragraphs = [], details = [], button, note }: EmailContent) {
  const base = appUrl()
  const logo = `${base}/email/logo.png`

  const rows = details
    .map(
      ({ label, value, mono }) => `<tr>
        <td style="padding:10px 16px;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 16px;font-size:14px;color:${INK};font-weight:600;${mono ? "font-family:SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:0.3px;" : ''}">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('')
  const table = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:#f6f7f9;border:1px solid #eaecf0;border-radius:12px;border-collapse:separate;">${rows}</table>`
    : ''

  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;"><tr>
        <td style="background:${LIME};border-radius:10px;">
          <a href="${escapeHtml(button.href)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:${DARK};text-decoration:none;border-radius:10px;">${escapeHtml(button.label)}</a>
        </td></tr></table>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader ?? heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;font-family:${FONT};">
      <tr><td style="background:${DARK};border-radius:16px 16px 0 0;padding:22px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;"><img src="${escapeHtml(logo)}" width="40" height="40" alt="${escapeHtml(APP_NAME)}" style="display:block;border:0;"></td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">${escapeHtml(APP_NAME)}</div>
            <div style="font-size:12px;color:#9ca3af;">Secure online examinations</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="background:${LIME};height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid #eaecf0;border-right:1px solid #eaecf0;">
        <h1 style="margin:0 0 18px;font-size:24px;line-height:30px;font-weight:700;color:${INK};letter-spacing:-0.3px;">${escapeHtml(heading)}</h1>
        ${paragraphs.map(p).join('')}
        ${table}
        ${cta}
        ${note ? `<p style="margin:14px 0 0;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(note)}</p>` : ''}
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid #eaecf0;border-top:0;border-radius:0 0 16px 16px;padding:20px 32px 26px;">
        <div style="border-top:1px solid #eaecf0;padding-top:16px;font-size:12px;line-height:19px;color:${MUTED};">
          Sent by ${escapeHtml(APP_NAME)}${base ? ` · <a href="${escapeHtml(base)}" style="color:${MUTED};">${escapeHtml(base.replace(/^https?:\/\//, ''))}</a>` : ''}<br>
          This is an automated message about your account. If it is not meant for you, you can ignore it.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

/** A plain-text twin of the same content; inboxes and spam filters like having one. */
export function renderText({ heading, paragraphs = [], details = [], button, note }: EmailContent) {
  return [
    heading,
    '',
    ...paragraphs.flatMap((text) => [text, '']),
    ...details.map(({ label, value }) => `${label}: ${value}`),
    ...(details.length ? [''] : []),
    ...(button ? [`${button.label}: ${button.href}`, ''] : []),
    ...(note ? [note, ''] : []),
    `${APP_NAME}`,
  ].join('\n')
}
