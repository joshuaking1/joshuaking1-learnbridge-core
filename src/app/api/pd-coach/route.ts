// src/app/api/pd-coach/route.ts
import Groq from 'groq-sdk';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Updated prompt to include completed modules
const getPdCoachPrompt = (activitySummary: string, completedModules: string[]) => `
You are an expert, encouraging, and insightful instructional coach for teachers in Ghana. Your goal is to provide personalized professional development recommendations based on a teacher's recent activity.

**Teacher's Recent Activity Summary:**
---
${activitySummary}
---

**Your Task:**
Analyze the summary and generate a JSON object with two keys: "weeklyInsight" and "recommendedModules".

**RULES:**
1.  **weeklyInsight:** Write a short, encouraging paragraph (2-3 sentences) that highlights a specific strength you observe and gently introduces a potential area for growth.
2.  **recommendedModules:** Generate an array of exactly 3 professional development module objects. Each object MUST have the following keys:
    - "title": string (A catchy, actionable title, e.g., "Mastering Project-Based Learning")
    - "description": string (A brief, compelling sentence explaining the module's benefit)
    - "category": string ("Pedagogy", "Assessment", "Curriculum", or "Platform Skills")
    - "icon": string (Choose one of these literal strings: "Lightbulb", "Zap", "BookOpen", "Grid")
3.  The recommendations should be directly relevant to the teacher's activity. For example, if they only use Multiple Choice questions, suggest a module on "Creative Assessment Strategies". If they teach science, suggest pedagogy relevant to science.
4.  **CRITICAL RULE:** Do NOT recommend any of the following modules, as the teacher has already completed them: ${completedModules.join(', ')}. Generate fresh, new ideas.
5.  The output MUST be a single, valid JSON object and nothing else.
`;

// Prompt for generating module content
const getModuleContentPrompt = (title: string, category: string) => `
You are an expert instructional designer creating a bite-sized professional development module for a Ghanaian teacher.
Module Topic: "${title}"
Category: "${category}"

**Your Task:**
Generate a JSON object with three keys: "keyConcepts", "practicalStrategies", and "reflectionQuiz".

**RULES:**
1.  **keyConcepts:** An array of 3-4 strings. Each string is a concise definition of a core idea related to the topic.
2.  **practicalStrategies:** An array of 3-4 objects. Each object must have two keys: "strategy" (string, a short, actionable title) and "description" (string, a 2-3 sentence explanation of how to implement it in a Ghanaian classroom).
3.  **reflectionQuiz:** An array of 2-3 objects. Each object must have two keys: "question" (string, a multiple-choice self-reflection question) and "options" (an array of 3 strings providing different perspectives or choices).
4.  The output MUST be a single, valid JSON object and nothing else.
`;

// New prompt for generating module quiz
const getModuleQuizPrompt = (title: string) => `
You are a rigorous examiner. Create a difficult, 5-question multiple-choice quiz to test a teacher's deep understanding of the professional development module "${title}". The questions should require application of knowledge, not just recall.

RULES:
1. Output MUST be a valid JSON object with a key "quizQuestions".
2. "quizQuestions" must be an array of 5 objects.
3. Each object needs keys: "question" (string), "options" (array of 4 strings), and "answer" (string, the correct option).
`;

// GET handler for recommendations
export async function GET(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Fetch recent teacher activity
        const { data: lessons, error: lessonError } = await supabase
            .from('lesson_plans')
            .select('plan_data')
            .eq('author_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(3);
        
        const { data: assessments, error: assessmentError } = await supabase
            .from('assessments')
            .select('assessment_data')
            .eq('author_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (lessonError || assessmentError) {
            console.error("Supabase fetch error:", lessonError || assessmentError);
            throw new Error("Failed to fetch teacher activity from the database.");
        }

        // *** NEW: Fetch completed modules ***
        const { data: completed, error: completedError } = await supabase
            .from('completed_pd_modules')
            .select('module_title')
            .eq('user_id', session.user.id);
        
        if (completedError) {
            console.error("Error fetching completed modules:", completedError);
            throw new Error("Failed to fetch completed modules.");
        }
        
        const completedTitles = completed?.map(c => c.module_title) || [];

        // 2. Create a summary of the activity
        let activitySummary = "No recent activity found.";
        if (lessons && lessons.length > 0) {
            const topics = lessons.map(l => l.plan_data.userInput?.topic || l.plan_data.subject).join(', ');
            const strategies = lessons.map(l => l.plan_data.pedagogicalStrategies).join(', ');
            activitySummary = `Recent lesson topics include: ${topics}. Common strategies used: ${strategies}. `;
        }
        if (assessments && assessments.length > 0) {
            const types = assessments.map(a => a.assessment_data.items.map((i: any) => i.type)).flat();
            const typeCounts = types.reduce((acc, type) => { acc[type] = (acc[type] || 0) + 1; return acc; }, {} as Record<string, number>);
            activitySummary += `Recent assessment types: ${JSON.stringify(typeCounts)}.`;
        }

        // 3. Get insights from the AI (now with completed modules)
        const userPrompt = getPdCoachPrompt(activitySummary, completedTitles);
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: userPrompt }],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            response_format: { type: "json_object" },
        });

        const responseJsonString = chatCompletion.choices[0]?.message?.content;
        if (!responseJsonString) throw new Error("AI returned an empty response.");
        
        const data = JSON.parse(responseJsonString);
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Error in PD Coach API:", error.message);
        return NextResponse.json({ error: `Failed to generate PD insights: ${error.message}` }, { status: 500 });
    }
}

// POST handler for modules, quiz generation, and certification
export async function POST(req: NextRequest) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { generationType, ...params } = body;

        switch (generationType) {
            case 'generate_module': {
                const { title, category } = params;
                if (!title || !category) {
                    return NextResponse.json({ error: "Title and category are required." }, { status: 400 });
                }

                const userPrompt = getModuleContentPrompt(title, category);
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: userPrompt }],
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    response_format: { type: "json_object" },
                });

                const responseJsonString = chatCompletion.choices[0]?.message?.content;
                if (!responseJsonString) throw new Error("AI returned an empty response for the module.");

                const data = JSON.parse(responseJsonString);
                return NextResponse.json(data);
            }

            case 'generate_quiz': {
                const { title } = params;
                if (!title) {
                    return NextResponse.json({ error: "Module title is required." }, { status: 400 });
                }

                const userPrompt = getModuleQuizPrompt(title);
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: userPrompt }],
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    response_format: { type: "json_object" },
                });

                const responseJsonString = chatCompletion.choices[0]?.message?.content;
                if (!responseJsonString) throw new Error("AI returned an empty response for the quiz.");

                const data = JSON.parse(responseJsonString);
                return NextResponse.json(data);
            }

            case 'record_completion_and_certify': {
                const { moduleTitle } = params;
                if (!moduleTitle) {
                    return NextResponse.json({ error: "Module title is required." }, { status: 400 });
                }

                // 1. Record completion
                const { data: completion, error: completionError } = await supabase
                    .from('completed_pd_modules')
                    .insert({ user_id: session.user.id, module_title: moduleTitle })
                    .select('id')
                    .single();

                if (completionError) {
                    console.error("Error recording completion:", completionError);
                    throw new Error("Failed to record module completion. Perhaps it's already completed?");
                }

                // 2. Fetch user's name for the certificate
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', session.user.id)
                    .single();

                // 3. Create certificate (using service role key for insert)
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                const { data: certificate, error: certError } = await supabaseAdmin
                    .from('pd_certificates')
                    .insert({
                        completion_id: completion.id,
                        user_id: session.user.id,
                        user_name: profile?.full_name || 'Valued Educator',
                        module_title: moduleTitle,
                    })
                    .select('id')
                    .single();

                if (certError) {
                    console.error("Error creating certificate:", certError);
                    throw new Error("Failed to issue certificate.");
                }
                
                return NextResponse.json({ certificateId: certificate.id });
            }

            default:
                return NextResponse.json({ error: "Invalid generation type." }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Error in PD Coach API (POST):", error.message);
        return NextResponse.json({ error: `Failed to process request: ${error.message}` }, { status: 500 });
    }
}