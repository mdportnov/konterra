import { appUrl, sendEmail } from './client'
import { passwordResetEmail, verificationEmail } from './templates'
import {
  EMAIL_VERIFICATION_TTL_HOURS,
  PASSWORD_RESET_TTL_MINUTES,
  generateOpaqueToken,
} from './tokens'
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  getUserAuthState,
  writeAuditLog,
} from '@/lib/db/queries'

export async function sendVerificationEmail(userId: string, email: string) {
  const user = await getUserAuthState(userId)
  if (!user) return { sent: false, error: 'user_not_found' as const }
  if (user.emailVerified) return { sent: false, error: 'already_verified' as const }

  const { token, hash } = generateOpaqueToken()
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000)
  await createEmailVerificationToken(userId, email, hash, expiresAt)

  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`
  const message = verificationEmail(user.name, link, EMAIL_VERIFICATION_TTL_HOURS)

  writeAuditLog({ userId, action: 'email_verification_request', targetId: email, targetType: 'email' })

  return sendEmail({ to: email, ...message })
}

export async function sendPasswordResetEmail(
  user: { id: string; email: string; name: string | null },
  ip: string | null,
) {
  const { token, hash } = generateOpaqueToken()
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
  await createPasswordResetToken(user.id, hash, expiresAt, ip)

  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`
  const message = passwordResetEmail(user.name, link, PASSWORD_RESET_TTL_MINUTES)

  writeAuditLog({
    userId: user.id,
    action: 'password_reset_request',
    targetId: user.email,
    targetType: 'email',
    ip: ip ?? undefined,
  })

  return sendEmail({ to: user.email, ...message })
}
