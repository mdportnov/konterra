import NextAuth from 'next-auth'
import authConfig from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const isLandingPage = pathname === '/'
  const isAuthPage = pathname.startsWith('/login')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isApiWaitlist = pathname.startsWith('/api/waitlist')

  if (isApiAuth || isApiWaitlist || isLandingPage) {
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
