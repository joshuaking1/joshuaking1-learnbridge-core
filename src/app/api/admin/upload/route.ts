// src/app/api/admin/upload/route.ts
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const cookieStore = cookies();
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('platform_role').eq('id', session.user.id).single();
    if (profile?.platform_role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const subjectTag = formData.get('subjectTag') as string;

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const filePath = `curriculum/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from('curriculum-private').upload(filePath, file);
    if (uploadError) return NextResponse.json({ error: `Storage Error: ${uploadError.message}` }, { status: 500 });

    const { data, error: dbError } = await supabaseAdmin.from('curriculum_documents').insert({ file_name: file.name, subject_tag: subjectTag, storage_path: uploadData.path }).select().single();
    if (dbError) return NextResponse.json({ error: "DB Error: " + dbError.message }, { status: 500 });

    return NextResponse.json(data);
}