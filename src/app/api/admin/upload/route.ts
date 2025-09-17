// src/app/api/admin/upload/route.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // 1. Verify the user is a Super Admin
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', session.user.id).single();
    if (profile?.platform_role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Get the file and metadata from the request body
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const subjectTag = formData.get('subjectTag') as string | null;

    if (!file || !subjectTag) {
        return NextResponse.json({ error: 'File and subjectTag are required.' }, { status: 400 });
    }

    // 3. Create the ADMIN client that can bypass RLS
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Use the ADMIN client to upload the file to storage
    const filePath = `curriculum/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('curriculum-private') // Use the correct, secure bucket
        .upload(filePath, file);

    if (uploadError) {
        return NextResponse.json({ error: `Storage Error: ${uploadError.message}` }, { status: 500 });
    }

    // 5. Use the ADMIN client to create the database record
    const { data, error: dbError } = await supabaseAdmin
        .from('curriculum_documents')
        .insert({
            file_name: file.name,
            subject_tag: subjectTag,
            storage_path: uploadData.path,
        })
        .select()
        .single();

    if (dbError) {
        return NextResponse.json({ error: "Database record failed: " + dbError.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

