import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { getUserByEmail, getUserById, updateLastActive, writeAuditLog } from '@/lib/db/queries'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import authConfig from './auth.config'

const DUMMY_BCRYPT_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8oP/2gk8mV.8pB4rUx1qQYk3WqFgEW'

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
        const ipRl = rateLimit(`login:ip:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 })
        const emailRl = rateLimit(`login:email:${email}`, { windowMs: 15 * 60 * 1000, max: 5 })
        if (!ipRl.ok || !emailRl.ok) {
          writeAuditLog({ action: 'login_failure', detail: `Rate limited IP=${ip} email=${email}` })
          return null
        }

        const user = await getUserByEmail(email)
        if (!user) {
          await compare(password, DUMMY_BCRYPT_HASH)
          writeAuditLog({ action: 'login_failure', detail: `Unknown email: ${email}` })
          return null
        }
        const valid = await compare(password, user.password)
        if (!valid) {
          writeAuditLog({ userId: user.id, action: 'login_failure', detail: `Wrong password for ${email}` })
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
        updateLastActive(token.id as string).catch(() => {})
      }
      return token
    },
  },
})
