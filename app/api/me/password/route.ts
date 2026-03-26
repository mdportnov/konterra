import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/lib/validation'
import { getUserPasswordHash, updateUser, writeAuditLog } from '@/lib/db/queries'
import { compare, hash } from 'bcryptjs'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  const body = await safeParseBody(req)
  if (!body) return badRequest('Invalid JSON body')

  const { currentPassword, newPassword } = body as Record<string, unknown>

  if (!currentPassword || typeof currentPassword !== 'string') {
    return badRequest('Current password is required')
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return badRequest('New password is required')
  }

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return badRequest(`New password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }

  if (newPassword.length > PASSWORD_MAX_LENGTH) {
    return badRequest(`New password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  }

  if (currentPassword === newPassword) {
    return badRequest('New password must be different from current password')
  }

  try {
    const storedHash = await getUserPasswordHash(session.user.id)
    if (!storedHash) return badRequest('Password change not available')

    const isValid = await compare(currentPassword, storedHash)
    if (!isValid) {
      return badRequest('Current password is incorrect')
    }

    const hashedPassword = await hash(newPassword, 12)
    await updateUser(session.user.id, { password: hashedPassword })
    writeAuditLog({ userId: session.user.id, action: 'password_change' })

    return success({ message: 'Password updated successfully' })
  } catch {
    return serverError('Failed to update password')
  }
}
