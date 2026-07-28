import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { getUserByEmail, getUserById, updateLastActive, writeAuditLog, countRecentLoginFailures } from '@/lib/db/queries'
import { rateLimitShared, getClientIp } from '@/lib/rate-limit'
import authConfig from './auth.config'

const DUMMY_BCRYPT_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8oP/2gk8mV.8pB4rUx1qQYk3WqFgEW'

const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000
const lastActiveSeen = new Map<string, number>()

// The UPDATE is already a no-op inside its own 5-minute window, but it still costs a round
// trip on every session refresh. Skipping it in-process removes that for warm instances.
function touchLastActive(userId: string) {
  const now = Date.now()
  const seen = lastActiveSeen.get(userId)
  if (seen && now - seen < LAST_ACTIVE_THROTTLE_MS) return
  lastActiveSeen.set(userId, now)
  if (lastActiveSeen.size > 5_000) {
    for (const [id, at] of lastActiveSeen) {
      if (now - at > LAST_ACTIVE_THROTTLE_MS) lastActiveSeen.delete(id)
    }
  }
  updateLastActive(userId).catch(() => {})
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null
        const email = (credentials.email as string).toLowerCase().trim()
        const password = credentials.password as string

        const ip = request instanceof Request ? getClientIp(request) : 'unknown'
        const [ipRl, emailRl] = await Promise.all([
          rateLimitShared(`login:ip:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 }),
          rateLimitShared(`login:email:${email}`, { windowMs: 15 * 60 * 1000, max: 5 }),
        ])
        if (!ipRl.ok || !emailRl.ok) {
          writeAuditLog({ action: 'login_failure', targetId: email, targetType: 'email', ip, detail: 'Rate limited' })
          return null
        }

        const recentFailures = await countRecentLoginFailures(email, 15 * 60 * 1000).catch(() => 0)
        if (recentFailures >= 5) {
          writeAuditLog({ action: 'login_failure', targetId: email, targetType: 'email', ip, detail: 'Rate limited (persistent)' })
          return null
        }

        const user = await getUserByEmail(email)
        if (!user) {
          await compare(password, DUMMY_BCRYPT_HASH)
          writeAuditLog({ action: 'login_failure', targetId: email, targetType: 'email', ip, detail: 'Unknown email' })
          return null
        }
        const valid = await compare(password, user.password)
        if (!valid) {
          writeAuditLog({ userId: user.id, action: 'login_failure', targetId: email, targetType: 'email', ip, detail: 'Wrong password' })
          return null
        }
        writeAuditLog({ userId: user.id, action: 'login_success' })
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = (user as { role?: string }).role ?? 'user'
      } else if (token.id) {
        const dbUser = await getUserById(token.id as string)
        if (dbUser) token.role = dbUser.role
        touchLastActive(token.id as string)
      }
      return token
    },
  },
})
