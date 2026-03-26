import { type NextRequest } from 'next/server'
import { success, notFound, serverError } from '@/lib/api-utils'
import { getInviterByCode } from '@/lib/db/queries'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  try {
    const row = await getInviterByCode(code)
    if (!row) return notFound('Invite')

    const { invite, inviterName } = row

    if (invite.usedBy || new Date(invite.expiresAt) < new Date()) {
      return notFound('Invite')
    }

    return success({ status: 'valid' as const, inviterName: inviterName ?? null })
  } catch (err) {
    console.error('[GET /api/public/invite]', err)
    return serverError('Failed to validate invite')
  }
}
