// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const { pathname } = req.nextUrl;

  // --- Case 1: User is NOT logged in ---
  // If they try to access any protected route, send them to login.
  if (!session && (pathname.startsWith('/teacher') || pathname.startsWith('/student') || pathname.startsWith('/onboarding'))) {
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  // --- Case 2: User IS logged in ---
  if (session) {
    // Fetch the user's profile. This is the crucial check.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    // Sub-Case 2a: Logged in, but NO PROFILE (New User)
    // If they are trying to go anywhere EXCEPT the onboarding page, force them to onboarding.
    if (!profile && !pathname.startsWith('/onboarding')) {
      const role = session.user.user_metadata.role || 'student'; // Get role from signup metadata
      const onboardingUrl = new URL('/onboarding', req.url);
      onboardingUrl.searchParams.set('role', role);
      return NextResponse.redirect(onboardingUrl);
    }
    
    // Sub-Case 2b: Logged in, AND HAS PROFILE (Existing User)
    if (profile) {
      // If they try to access the onboarding page, send them to their dashboard.
      if (pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL(`/${profile.role}`, req.url));
      }
      
      // If a student tries to access a teacher route (or vice versa), redirect them.
      if (profile.role === 'student' && pathname.startsWith('/teacher')) {
        return NextResponse.redirect(new URL('/student', req.url));
      }
      if (profile.role === 'teacher' && pathname.startsWith('/student')) {
        return NextResponse.redirect(new URL('/teacher', req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Apply middleware to all key routes
    '/teacher/:path*',
    '/student/:path*',
    '/onboarding',
  ],
};