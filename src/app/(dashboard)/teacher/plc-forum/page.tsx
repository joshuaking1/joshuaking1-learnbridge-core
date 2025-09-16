// src/app/(dashboard)/teacher/plc-forum/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ForumFeed } from '@/components/forums/ForumFeed';

export default async function PLCForumPage() {
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect('/auth/login');

    // **THE FIX: The query was wrong. This is the correct way to get the profile.**
    const { data: posts, error } = await supabase
        .from('forum_posts')
        .select(`
            *,
            profiles!inner ( full_name ) 
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("THE FINAL FORUM ERROR:", error);
        return <div>Error loading discussions. The database relationship is broken.</div>;
    }

    return <ForumFeed initialPosts={posts || []} user={user} />;
}