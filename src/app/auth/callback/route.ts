// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // The login form doesn't pass the role anymore, so we can't reliably know it.
  // We will always redirect to a neutral, protected route like /teacher.
  // The middleware will then take over and route the user correctly based on their profile.
  const redirectUrl = new URL('/teacher', request.url);
  return NextResponse.redirect(redirectUrl);
}