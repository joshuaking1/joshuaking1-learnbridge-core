// src/app/api/admin/actions/route.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// This function acts as a middleware within the API route
async function verifyAdmin(supabase: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Unauthorized', user: null };

    const { data: profile } = await supabase
        .from('profiles')
        .select('platform_role')
        .eq('id', session.user.id)
        .single();
    
    if (profile?.platform_role !== 'SUPER_ADMIN') {
        return { error: 'Forbidden', user: null };
    }
    return { error: null, user: session.user };
}


export async function POST(req: NextRequest) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookies().getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookies().set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
    const { error: authError } = await verifyAdmin(supabase);
    if (authError) {
        return NextResponse.json({ error: authError }, { status: authError === 'Unauthorized' ? 401 : 403 });
    }

    const { action, targetUserId, payload } = await req.json();
    if (!action || !targetUserId) {
        return NextResponse.json({ error: "Action and targetUserId are required." }, { status: 400 });
    }

    // Use the Admin client to perform privileged operations
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        switch (action) {
            case 'update_role':
                if (!payload || !payload.newRole) throw new Error("newRole is required for update_role action.");
                const { error: roleError } = await supabaseAdmin
                    .from('profiles')
                    .update({ platform_role: payload.newRole })
                    .eq('id', targetUserId);
                if (roleError) throw roleError;
                break;

            case 'toggle_suspension':
                if (payload === undefined || typeof payload.is_suspended !== 'boolean') throw new Error("is_suspended (boolean) is required for toggle_suspension action.");
                 const { error: suspendError } = await supabaseAdmin
                    .from('profiles')
                    .update({ is_suspended: payload.is_suspended })
                    .eq('id', targetUserId);
                if (suspendError) throw suspendError;
                break;
            
            // The 'impersonate' action would be more complex and require a custom JWT signing function.
            // We will leave this unimplemented for now as it's a significant security feature.

            default:
                throw new Error("Invalid action specified.");
        }

        return NextResponse.json({ success: true, message: `Action '${action}' completed successfully.` });

    } catch (error: any) {
        console.error(`Admin action failed:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
