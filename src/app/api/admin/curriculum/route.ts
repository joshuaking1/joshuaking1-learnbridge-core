// src/app/api/admin/curriculum/route.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// This function re-verifies that the caller is a Super Admin
async function verifyAdmin(supabase: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', session.user.id).single();
    return profile?.platform_role === 'SUPER_ADMIN';
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
    const isAdmin = await verifyAdmin(supabase);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileName, subjectTag, storagePath } = await req.json();

    // Use the Admin client to interact with the (now non-RLS) table
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
        .from('curriculum_documents')
        .insert({
            file_name: fileName,
            subject_tag: subjectTag,
            storage_path: storagePath,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: "Database record failed: " + error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

