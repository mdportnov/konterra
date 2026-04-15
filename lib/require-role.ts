import type { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/auth'
import { unauthorized, forbidden } from './api-utils'

export type Role = 'user' | 'moderator' | 'admin'

type Success = { error?: undefined; session: Session; userId: string; role: Role }
type Failure = { error: NextResponse; session?: undefined; userId?: undefined; role?: undefined }

export async function requireRole(roles: Role[]): Promise<Success | Failure> {
  const session = (await auth()) as Session | null
  if (!session?.user?.id) return { error: unauthorized() }
  const role = ((session.user as { role?: Role }).role ?? 'user') as Role
  if (!roles.includes(role)) return { error: forbidden() }
  return { session, userId: session.user.id, role }
}
