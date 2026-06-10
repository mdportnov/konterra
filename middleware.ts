import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { NextResponse } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/locales'

const LOCALE_ROUTES = new Set(
  LOCALES.filter(l => l !== DEFAULT_LOCALE).map(l => `/${l}`)
)

const { auth } = NextAuth(authConfig)

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/mcp')) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    MUTATING_METHODS.has(req.method)
  ) {
    const origin = req.headers.get('origin')
    if (origin) {
      const expectedHost = req.headers.get('x-forwarded-host') ?? req.nextUrl.host
      let originHost: string | null = null
      try {
        originHost = new URL(origin).host
      } catch {
        originHost = null
      }
      if (originHost !== expectedHost) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
      }
    }
  }
  const isLandingPage = pathname === '/'
  const isLocaleLanding = LOCALE_ROUTES.has(pathname)
  const isAuthPage = pathname.startsWith('/login')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isApiWaitlist = pathname.startsWith('/api/waitlist')
  const isPublicProfile = pathname.startsWith('/u/')
  const isPublicApi = pathname.startsWith('/api/public/')
  const isPrivacyPage = pathname === '/privacy'
  const isOfflinePage = pathname === '/offline'

  if (isApiAuth || isApiWaitlist || isLandingPage || isLocaleLanding || isPublicProfile || isPublicApi || isPrivacyPage || isOfflinePage) {
    return NextResponse.next()
  }

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/app', req.url))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
