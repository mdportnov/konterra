import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import {
  getUsersDueForDigest,
  markDigestSent,
  getAllContactsByUserId,
  getAllFavorsByUserId,
  getTripsByUserId,
  getOrCreateUnsubscribeToken,
  writeAuditLog,
  purgeExpiredAuthTokens,
} from '@/lib/db/queries'
import { buildDigest } from '@/lib/digest/build'
import { digestEmail } from '@/lib/email/templates'
import { appUrl, isEmailConfigured, sendEmail } from '@/lib/email/client'
import { generateOpaqueToken } from '@/lib/email/tokens'

export const maxDuration = 300

/**
 * Scheduled by vercel.json. Authorised with CRON_SECRET so the endpoint cannot be used to
 * force-send mail; Vercel Cron sends the secret as a bearer token.
 */
function authorize(req: Request): boolean {
  const secret = env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ skipped: true, reason: 'email_not_configured' })
  }

  const purged = await purgeExpiredAuthTokens().catch(() => null)

  const due = await getUsersDueForDigest()
  let sent = 0
  let skippedEmpty = 0
  let failed = 0

  for (const user of due) {
    try {
      const [contacts, favors, trips] = await Promise.all([
        getAllContactsByUserId(user.id),
        getAllFavorsByUserId(user.id),
        getTripsByUserId(user.id),
      ])

      const digest = buildDigest({ contacts, favors, trips })

      // Nothing worth saying is a reason to stay silent, not to send an empty email. The
      // send timestamp still advances so we do not re-evaluate this user every night.
      if (!digest.hasContent) {
        skippedEmpty++
        await markDigestSent(user.id)
        continue
      }

      const token = await getOrCreateUnsubscribeToken(user.id, () => generateOpaqueToken().token)
      const encoded = encodeURIComponent(token)
      // The human-facing page confirms before acting; the header URL must be the endpoint
      // that RFC 8058 one-click clients POST to directly.
      const unsubscribePage = `${appUrl()}/unsubscribe?token=${encoded}`
      const unsubscribeEndpoint = `${appUrl()}/api/public/unsubscribe?token=${encoded}`
      const message = digestEmail(user.name, digest.sections, unsubscribePage)

      const result = await sendEmail({
        to: user.email,
        ...message,
        headers: {
          'List-Unsubscribe': `<${unsubscribeEndpoint}>, <${unsubscribePage}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      if (result.sent) {
        sent++
        await markDigestSent(user.id)
        writeAuditLog({
          userId: user.id,
          action: 'digest_send',
          targetType: 'digest',
          detail: JSON.stringify(digest.counts),
        })
      } else {
        failed++
      }
    } catch (e) {
      failed++
      console.error(`[cron/digest] failed for ${user.id}:`, e)
    }
  }

  return NextResponse.json({ candidates: due.length, sent, skippedEmpty, failed, purged })
}
