// src/app/(super-admin)/admin/quests/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { QuestAuthoringClient } from '@/components/admin/quest-authoring-client';

export default async function QuestAuthoringPage() {
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

    // Fetch existing quest lines to display
    const { data: questLines } = await supabase
        .from('quest_lines')
        .select('*, quest_line_items(count)')
        .order('created_at', { ascending: false });

    return <QuestAuthoringClient initialQuestLines={questLines || []} />;
}