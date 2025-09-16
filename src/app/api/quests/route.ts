// src/app/api/quests/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Handle marking a quest as complete
export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                set(name, value, options) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name, options) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { questId, xpReward } = await req.json();
    if (!questId || !xpReward) {
        return NextResponse.json({ error: 'questId and xpReward are required.' }, { status: 400 });
    }

    try {
        // 1. Update the quest status
        const { error: questError } = await supabase
            .from('student_quests')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', questId)
            .eq('student_id', session.user.id);
        if (questError) throw questError;

        // 2. Award the XP to the student
        // We use an RPC call to safely increment the XP value
        const { error: xpError } = await supabase.rpc('award_xp', {
            user_id: session.user.id,
            xp_to_add: xpReward
        });
        if (xpError) throw xpError;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error completing quest:", error.message);
        return NextResponse.json({ error: "Failed to complete quest." }, { status: 500 });
    }
}