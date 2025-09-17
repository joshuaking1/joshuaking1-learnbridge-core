// src/app/(super-admin)/admin/curriculum/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CurriculumClient } from '@/components/admin/curriculum-client';

export default async function CurriculumPage() {
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
    
    const { data: documents } = await supabase
        .from('curriculum_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

    return <CurriculumClient initialDocuments={documents || []} />;
}