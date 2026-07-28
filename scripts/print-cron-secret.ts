import { config } from 'dotenv'
import { createHmac } from 'crypto'

config({ path: '.env.local' })

/**
 * Prints the value Vercel Cron must send as `Authorization: Bearer <secret>`. Run it when
 * CRON_SECRET has not been set explicitly and you need the derived one.
 */
const explicit = process.env.CRON_SECRET
if (explicit) {
  console.log(explicit)
} else {
  const authSecret = process.env.AUTH_SECRET
  if (!authSecret) {
    console.error('AUTH_SECRET is not set, so no cron secret can be derived.')
    process.exit(1)
  }
  console.log(createHmac('sha256', authSecret).update('konterra:cron').digest('hex'))
}
