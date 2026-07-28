import { appUrl } from './client'

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface LayoutOptions {
  heading: string
  body: string
  footerNote?: string
}

export function layout({ heading, body, footerNote }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#0e0d0b;font-family:ui-sans-serif,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0d0b;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#17150f;border:1px solid #2b2720;border-radius:14px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 24px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#b0651f;">Konterra</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:#f2ede3;">${escapeHtml(heading)}</h1>
          ${body}
        </td></tr>
      </table>
      <p style="max-width:520px;margin:20px auto 0;font-size:11px;line-height:1.6;color:#6f675c;text-align:center;">
        ${footerNote ? `${footerNote}<br>` : ''}
        <a href="${appUrl()}" style="color:#6f675c;">konterra.space</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#c9c2b5;">${text}</p>`
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:8px;background:#b0651f;">
      <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#12100c;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`
}

export function passwordResetEmail(name: string | null, link: string, ttlMinutes: number) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return {
    subject: 'Reset your Konterra password',
    html: layout({
      heading: 'Reset your password',
      body:
        paragraph(greeting) +
        paragraph('Use the button below to choose a new password. The link works once and expires in ' + ttlMinutes + ' minutes.') +
        button(link, 'Set a new password') +
        paragraph('If you did not ask for this, you can ignore this email — your password stays unchanged.'),
    }),
    text: `${name ? `Hi ${name},` : 'Hi,'}\n\nReset your Konterra password using this link (valid once, expires in ${ttlMinutes} minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
  }
}

export function verificationEmail(name: string | null, link: string, ttlHours: number) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi,'
  return {
    subject: 'Confirm your email for Konterra',
    html: layout({
      heading: 'Confirm your email',
      body:
        paragraph(greeting) +
        paragraph('Confirm this address so you can recover your account if you ever lose your password.') +
        button(link, 'Confirm email') +
        paragraph(`The link expires in ${ttlHours} hours.`),
    }),
    text: `${name ? `Hi ${name},` : 'Hi,'}\n\nConfirm your email for Konterra (expires in ${ttlHours} hours):\n${link}`,
  }
}
