import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSubscription } from '@/utils/supabase/queries'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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

  const subscription = await getSubscription(supabase)

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/account') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/main' &&
    request.nextUrl.pathname !== '/main/rhetorify' &&
    request.nextUrl.pathname !== '/main/known-bugs' &&
    request.nextUrl.pathname !== '/terms' &&
    request.nextUrl.pathname !== '/privacy' &&
    request.nextUrl.pathname !== '/main/contact-us' &&
    request.nextUrl.pathname !== '/main/faq' &&
    request.nextUrl.pathname !== '/sitemap.xml' &&
    request.nextUrl.pathname !== '/robots.txt' &&
    !request.nextUrl.pathname.startsWith('/main/office-hours') &&
    request.nextUrl.pathname !== '/welcome' &&
    request.nextUrl.pathname !== '/'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/account/login'
    return NextResponse.redirect(url)
  } else if (
    subscription === null && (request.nextUrl.pathname === '/main/ai' || request.nextUrl.pathname === '/main/cut' || request.nextUrl.pathname === '/main/advanced' || request.nextUrl.pathname === '/main/extendify' || request.nextUrl.pathname === '/main/theorify' || request.nextUrl.pathname === '/main/advanced' || request.nextUrl.pathname === '/main/extendify' || request.nextUrl.pathname === '/main/contentions' || request.nextUrl.pathname === '/main/blockfile')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/main/block'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}