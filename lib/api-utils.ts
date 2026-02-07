import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export function toStringOrNull(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim()
  return null
}

export function toDateOrNull(v: unknown): Date | null {
  if (!v) return null
  if (v instanceof Date) return v
  const d = new Date(v as string)
  return isNaN(d.getTime()) ? null : d
}

export function toArrayOrNull<T = string>(v: unknown): T[] | null {
  return Array.isArray(v) ? (v as T[]) : null
}

export function toNumberOrNull(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(entity = 'Resource') {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 })
}

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, limit: 50 }) {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page), 10) || defaults.page)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || String(defaults.limit), 10) || defaults.limit))
  return { page, limit }
}

type AuthenticatedHandler = (
  req: Request,
  userId: string,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: Request, ctx: { params: Promise<Record<string, string>> }) => {
    const session = await auth()
    if (!session?.user?.id) return unauthorized()
    return handler(req, session.user.id, ctx)
  }
}
