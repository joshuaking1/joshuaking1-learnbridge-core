// src/app/api/auth/signup/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password, role, fingerprint } = await req.json();
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  // Check if a user with this fingerprint already exists
  const { data: existingUser, error: fingerprintError } = await supabase
    .from('profiles')
    .select('id')
    .eq('fingerprint', fingerprint)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: 'An account already exists for this device.' }, { status: 409 }); // 409 Conflict
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The email verification link will now point to our callback
      emailRedirectTo: `${new URL(req.url).origin}/api/auth/callback`,
      // We store the intended role and the unique fingerprint in the metadata
      data: {
        role: role,
        fingerprint: fingerprint
      }
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json(data);
}
