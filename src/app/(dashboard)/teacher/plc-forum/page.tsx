// src/app/(dashboard)/teacher/plc-forum/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PlcForumClient } from '@/components/forums/plc-forum-client';

export default async function PLCForumPage() {
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

    // Fetch initial data on the server using the RPC
    const { data: posts, error } = await supabase
        .rpc('get_forum_posts_with_details');

    if (error) {
        return <div>Error loading discussions.</div>;
    }

    // Render the Client Component
    return (
        <PlcForumClient initialPosts={posts || []} user={session.user} />
    );
}