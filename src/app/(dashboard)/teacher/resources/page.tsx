// src/app/(dashboard)/teacher/resources/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ResourceVaultClient } from '@/components/resources/resource-vault-client';

export default async function ResourceVaultPage() {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookies().get(name)?.value;
                },
            },
        }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/auth/login');

    // Fetch initial data on the server
    const { data: files, error } = await supabase.storage
            .from('teacher-resources')
        .list(session.user.id, { sortBy: { column: 'created_at', order: 'desc' } });

        if (error) {
        // Handle error state gracefully
        return <div>Error loading resources.</div>
    }

    // Render the Client Component, passing the server-fetched data as props
    return (
        <div className="flex flex-col gap-6">
            <ResourceVaultClient initialFiles={files || []} user={session.user} />
        </div>
    );
}