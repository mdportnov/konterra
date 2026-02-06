import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { getUser } from '@/lib/store'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        return {
          id: credentials.email as string,
          email: credentials.email as string,
          name: (credentials.email as string).split('@')[0]
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      const stored = getUser(token.id as string)
      if (stored?.name) {
        token.name = stored.name
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt'
  }
})
