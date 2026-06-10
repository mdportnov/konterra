import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { unauthorized, notFound, success, serverError } from '@/lib/api-utils'
import { deleteApiToken } from '@/lib/db/queries'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    const { id } = await params
    const deleted = await deleteApiToken(id, session.user.id)
    if (!deleted) return notFound('Token')
    return success({ deleted: true })
  } catch (e) {
    console.error('Delete token error:', e)
    return serverError('Failed to delete token')
  }
}
