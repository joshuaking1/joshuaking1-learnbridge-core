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
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const planData = await req.json();

        const { subject, grade, week } = planData.userInput;
        
        // **THE DEFINITIVE FIX IS HERE**
        // The column is 'author_id', not 'user_id'.
        const { data, error } = await supabase
            .from('lesson_plans')
            .insert({
                author_id: user.id, // CORRECTED COLUMN NAME
                plan_data: planData,
                subject,
                grade,
                week
            })
            .select('id')
            .single();

        if (error) throw error;
        
        // Return the plan data along with the new ID
        return NextResponse.json({ id: data.id, planData });

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
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options: any) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
                updated_at: new Date().toISOString(),
            })
            .eq('id', planId)
            .eq('author_id', user.id); // Also ensure this uses the correct column name

        if (error) throw error;
        
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error updating lesson plan:", error.message);
        return NextResponse.json({ error: "Failed to update lesson plan." }, { status: 500 });
    }
}