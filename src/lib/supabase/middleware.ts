import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Fast-path: Public routes do not need any authentication checks
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return supabaseResponse
  }

  // Fast-path: Check if any Supabase auth cookies exist before making network calls
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  // If user is accessing protected routes without auth cookie, redirect immediately
  if (!hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role check: use JWT metadata first (fast, avoids an extra DB round-trip)
  let role = user.user_metadata?.role

  if (!role) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role
  }

  if (pathname.startsWith('/teacher') && role !== 'TEACHER') {
    const url = request.nextUrl.clone()
    url.pathname = '/student'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/student') && role !== 'STUDENT') {
    const url = request.nextUrl.clone()
    url.pathname = '/teacher'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
