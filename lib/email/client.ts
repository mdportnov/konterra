import { env } from '@/lib/env'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'Konterra <hello@konterra.space>'

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
  headers?: Record<string, string>
}

export function appUrl(): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY)
}

/**
 * Sends through Resend's REST API. When no key is configured the message is logged
 * instead of sent, so local development and preview deploys keep working without silently
 * pretending an email went out.
 */
export async function sendEmail(message: OutgoingEmail): Promise<{ sent: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email] RESEND_API_KEY not set — not sending "${message.subject}" to ${message.to}.\n${message.text}`,
    )
    return { sent: false, error: 'email_not_configured' }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || DEFAULT_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[email] send failed (${res.status}): ${detail}`)
      return { sent: false, error: `resend_${res.status}` }
    }

    return { sent: true }
  } catch (e) {
    console.error('[email] transport error:', e)
    return { sent: false, error: 'transport_error' }
  }
}
