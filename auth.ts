import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { upsertUser } from '@/lib/db/queries'
import authConfig from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = credentials.email as string
        const id = email
        const name = email.split('@')[0]
        const user = await upsertUser(id, email, name)
        return { id, email, name: user?.name ?? name }
      }
    })
  ],
})
