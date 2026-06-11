import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, notFound, success, serverError } from '@/lib/api-utils'
import { deleteApiToken, writeAuditLog } from '@/lib/db/queries'
import { getClientIp } from '@/lib/rate-limit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const { id } = await params
    const deleted = await deleteApiToken(id, session.user.id)
    if (!deleted) return notFound('Token')
    writeAuditLog({
      userId: session.user.id,
      action: 'token_revoke',
      targetId: id,
      targetType: 'api_token',
      ip: getClientIp(req),
    })
    return success({ deleted: true })
  } catch (e) {
    console.error('Delete token error:', e)
    return serverError('Failed to delete token')
  }
}
