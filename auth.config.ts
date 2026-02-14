import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

export default {
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      authorize() {
        return null
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = (user as { role?: string }).role ?? 'user'
      } else if (token.id) {
        const { getUserById } = await import('@/lib/db/queries')
        const dbUser = await getUserById(token.id as string)
        if (dbUser) {
          token.role = dbUser.role
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? 'user'
      }
      return session
    },
  },
  session: {
    strategy: 'jwt'
  }
} satisfies NextAuthConfig
