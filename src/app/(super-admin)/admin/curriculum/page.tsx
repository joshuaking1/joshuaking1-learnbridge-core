// src/app/(super-admin)/admin/curriculum/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CurriculumClient } from '@/components/admin/curriculum-client';

export default async function CurriculumPage() {
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
    
    // **THE FIX: Select ALL columns needed by the client**
    const { data: documents } = await supabase
        .from('curriculum_documents')
        .select('id, file_name, subject_tag, processing_status, uploaded_at, storage_path')
        .order('uploaded_at', { ascending: false });

    return <CurriculumClient initialDocuments={documents || []} />;
}