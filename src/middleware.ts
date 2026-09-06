// ============================================================================
// src/middleware.ts
// SIH PS26034 — Next.js Middleware for Supabase Session Refresh
//
// Purpose:
//   Refreshes the Supabase session on every server request so that:
//   1. Expired JWTs are renewed using the refresh token cookie.
//   2. Server Components always receive a valid, up-to-date session.
//
// SECURITY NOTES:
//   - This middleware does NOT enforce authorization; it only keeps the
//     session cookie fresh. Authorization is enforced in Server Components
//     and Route Handlers via src/lib/auth/helpers.ts guards.
//   - The middleware pattern follows the @supabase/ssr recommended approach.
//   - The service-role key is never touched here.
// ============================================================================

import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database.types"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: Array<{
            name: string
            value: string
            options?: CookieOptions
          }>
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
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

  // Refresh session — IMPORTANT: do not remove this call.
  // It keeps the session alive and updates the cookie if the token was refreshed.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /api/health (public health check endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/health).*)",
  ],
}
