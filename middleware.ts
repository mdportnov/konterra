import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { NextResponse } from 'next/server'
import { LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/locales'

const LOCALE_ROUTES = new Set(
  LOCALES.filter(l => l !== DEFAULT_LOCALE).map(l => `/${l}`)
)

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
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
