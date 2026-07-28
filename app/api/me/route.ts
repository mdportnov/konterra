import { auth } from '@/auth'
import { unauthorized, badRequest, success, serverError } from '@/lib/api-utils'
import { safeParseBody } from '@/lib/validation'
import { deleteUserAccount, getUserById, getUserPasswordHash, writeAuditLog } from '@/lib/db/queries'
import { getClientIp, rateLimitShared } from '@/lib/rate-limit'
import { compare } from 'bcryptjs'

/**
 * Account deletion is irreversible and cascades to every row the user owns, so it is
 * re-authenticated: a stolen session alone must not be enough to destroy the account.
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()

    const ip = getClientIp(req)
    const rl = await rateLimitShared(`account-delete:${session.user.id}`, { windowMs: 15 * 60 * 1000, max: 5 })
    if (!rl.ok) return badRequest('Too many attempts. Try again later.')

    const body = await safeParseBody(req)
    const password = body?.password
    if (!password || typeof password !== 'string') {
      return badRequest('Confirm your password to delete the account')
    }

    const storedHash = await getUserPasswordHash(session.user.id)
    if (!storedHash) return badRequest('Account deletion is not available for this account')

    const valid = await compare(password, storedHash)
    if (!valid) return badRequest('Password is incorrect')

    const user = await getUserById(session.user.id)

    await deleteUserAccount(session.user.id)

    // The audit row deliberately outlives the user row (audit_log.user_id has no FK), so
    // there is a record that the erasure happened and when.
    writeAuditLog({
      userId: session.user.id,
      action: 'account_delete',
      targetId: user?.email ?? session.user.id,
      targetType: 'user',
      ip,
      detail: 'Self-service account deletion',
    })

    return success({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/me]', err)
    return serverError()
  }
}
