import { auth } from '@/auth'
import { deleteTrip } from '@/lib/db/queries'
import { unauthorized, success } from '@/lib/api-utils'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params
  await deleteTrip(id, session.user.id)
  return success({ deleted: true })
}
