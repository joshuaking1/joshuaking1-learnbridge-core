// src/app/api/lesson-plans/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Handle CREATING a new lesson plan
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

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const planData = await req.json();

        // Extract metadata for top-level columns
        const { subject, grade, week } = planData.userInput;
        
        const { data, error } = await supabase
            .from('lesson_plans')
            .insert({
                user_id: session.user.id,
                plan_data: planData,
                subject,
                grade,
                week
            })
            .select('id') // Return the ID of the newly created plan
            .single();

        if (error) throw error;
        
        return NextResponse.json({ id: data.id });

    } catch (error: any) {
        console.error("Error saving lesson plan:", error.message);
        return NextResponse.json({ error: "Failed to save lesson plan." }, { status: 500 });
    }
}


// Handle UPDATING an existing lesson plan
export async function PATCH(req: NextRequest) {
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

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { planId, planData } = await req.json();

        if (!planId || !planData) {
            return NextResponse.json({ error: "planId and planData are required." }, { status: 400 });
        }
        
        const { data, error } = await supabase
            .from('lesson_plans')
            .update({
                plan_data: planData,
                updated_at: new Date().toISOString(), // Manually update the timestamp
            })
            .eq('id', planId)
            .eq('user_id', session.user.id); // Ensure user can only update their own plans

        if (error) throw error;
        
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error updating lesson plan:", error.message);
        return NextResponse.json({ error: "Failed to update lesson plan." }, { status: 500 });
    }
}