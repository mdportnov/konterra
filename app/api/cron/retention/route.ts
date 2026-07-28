import { NextResponse } from 'next/server'
import {
  purgeExpiredRetentionData,
  AUDIT_LOG_RETENTION_DAYS,
  GEOCODE_CACHE_RETENTION_DAYS,
} from '@/lib/db/queries'
import { isAuthorizedCron } from '@/lib/cron-auth'

export const maxDuration = 120

/**
 * Enforces the retention schedule published in the privacy policy. Data that is kept
 * "until no longer needed" in a policy but forever in practice is the gap regulators care
 * about, so this runs nightly rather than on request.
 */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const purged = await purgeExpiredRetentionData()
    return NextResponse.json({
      purged,
      policy: {
        auditLogRetentionDays: AUDIT_LOG_RETENTION_DAYS,
        geocodeCacheRetentionDays: GEOCODE_CACHE_RETENTION_DAYS,
      },
    })
  } catch (err) {
    console.error('[cron/retention]', err)
    return NextResponse.json({ error: 'Retention job failed' }, { status: 500 })
  }
}
