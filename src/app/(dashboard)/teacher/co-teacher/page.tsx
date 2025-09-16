// src/app/(dashboard)/teacher/co-teacher/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CoTeacherHub } from '@/components/chat/CoTeacherHub'; // The new, unified client component

export default async function AICoTeacherPage() {
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
    if (error || !user) redirect('/auth/login');

    // Fetch all initial data on the server for a fast initial load
    const { data: sessions } = await supabase
        .from('ai_chat_sessions')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const { data: personas } = await supabase
        .from('ai_personas')
        .select('*')
        .eq('user_id', user.id);

    return (
        // Pass all server-fetched data down to the main client component
        <CoTeacherHub
            initialSessions={sessions || []}
            initialPersonas={personas || []}
            user={user}
        />
    );
}
