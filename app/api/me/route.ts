import { auth } from '@/auth'
import { unauthorized, success, serverError } from '@/lib/api-utils'
import { deleteUserAccount } from '@/lib/db/queries'

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    await deleteUserAccount(session.user.id)
    return success({ deleted: true })
  } catch {
    return serverError()
  }
}
