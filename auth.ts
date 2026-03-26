import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { getUserByEmail, getUserById, updateLastActive, writeAuditLog } from '@/lib/db/queries'
import authConfig from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string
        const user = await getUserByEmail(email)
        if (!user) {
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
