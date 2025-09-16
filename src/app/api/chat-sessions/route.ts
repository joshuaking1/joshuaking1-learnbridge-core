// src/app/api/chat-sessions/route.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // First, create a client based on the user's cookie to verify they are logged in.
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, personaId } = await req.json();

    // Now, create the ADMIN client which can bypass RLS.
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Perform the insert using the server-verified user ID.
    const { data, error: insertError } = await supabaseAdmin
        .from('ai_chat_sessions')
        .insert({
            user_id: user.id, // Secure, server-verified ID
            title: title,
            persona_id: personaId,
        })
        .select('id, title, created_at')
        .single();

    if (insertError) {
        console.error("Admin Insert Error:", insertError);
        return NextResponse.json({ error: "Database error: " + insertError.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
