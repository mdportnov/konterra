export const dynamic = 'force-dynamic'
import { success } from '@/lib/api-utils'
import { requireRole } from '@/lib/require-role'
import { getAdminStats } from '@/lib/db/queries'

export async function GET() {
  const r = await requireRole(['admin', 'moderator'])
  if (r.error) return r.error
  return success(await getAdminStats())
}
