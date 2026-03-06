import { type NextRequest } from 'next/server'
import { auth } from '@/auth'
import { verifyContactOwnership, getSocialPreviewsByContactId } from '@/lib/db/queries'
import { unauthorized, notFound, success } from '@/lib/api-utils'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const { id } = await params
  const owns = await verifyContactOwnership(id, session.user.id)
  if (!owns) return notFound('Contact')

  const previews = await getSocialPreviewsByContactId(id)
  return success(previews)
}
