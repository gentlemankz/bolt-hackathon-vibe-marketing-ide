import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Skip middleware for Facebook OAuth callback and other auth-related API routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth/facebook') ||
    request.nextUrl.pathname.startsWith('/api/auth/callback') ||
    request.nextUrl.pathname === '/api/auth/confirm'
  ) {
    return
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Facebook OAuth callback routes
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth/facebook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
