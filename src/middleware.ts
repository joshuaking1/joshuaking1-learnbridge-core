// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  
  const { pathname } = req.nextUrl;

  // --- LOGGED-OUT USER ---
  // If the user is not logged in and trying to access protected routes, redirect to home.
  if (!session && (pathname.startsWith('/teacher') || pathname.startsWith('/student'))) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // --- LOGGED-IN USER ---
  if (session) {
    // Fetch profile once for the logged-in user
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    // -- Sub-Case 1: User is logged in but has NOT onboarded (no profile) --
    if (!profile) {
      // If they are not on the onboarding page, force them to it.
      if (!pathname.startsWith('/onboarding')) {
        // We need to know their role from somewhere. The callback should have set it.
        // For now, let's just create the URL. The callback will handle setting the `role` param.
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }
    }

    // -- Sub-Case 2: User is logged in AND has onboarded (profile exists) --
    if (profile) {
      const userRole = profile.role; // 'teacher' or 'student'
      
      // If they try to visit the onboarding page, redirect them to their dashboard.
      if (pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL(`/${userRole}`, req.url));
      }

      // If a teacher tries to access a student route, or vice-versa, redirect them correctly.
      if (userRole === 'teacher' && pathname.startsWith('/student')) {
        return NextResponse.redirect(new URL('/teacher', req.url));
      }
      if (userRole === 'student' && pathname.startsWith('/teacher')) {
        return NextResponse.redirect(new URL('/student', req.url));
      }
    }
  }

  // If none of the above conditions are met, allow the request to proceed.
  return res;
}

// Update the matcher to run on all relevant pages.
export const config = {
  matcher: [
    '/teacher/:path*',
    '/student/:path*',
    '/onboarding',
  ],
};