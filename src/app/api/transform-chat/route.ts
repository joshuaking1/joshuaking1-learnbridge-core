import Groq from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// This prompt is a "meta-prompt". It instructs the AI on how to process another conversation.
const getTransformationPrompt = (chatHistory: string, targetFormat: 'lesson_plan' | 'assessment') => {
    const lessonPlanStructure = `{
        "subject": "string",
        "strand": "string", 
        "subStrand": "string",
        "contentStandard": "string",
        "indicators": "string",
        "coreCompetencies": "string",
        "learningObjectives": "string",
        "materials": "string",
        "activities": [
            {
                "phase": "string",
                "teacherActivity": "string", 
                "learnerActivity": "string"
            }
        ],
        "assessment": "string",
        "reflection": "string"
    }`;
    
    const assessmentStructure = `{
        "topic": "string",
        "grade": "string",
        "requests": [
            {
                "dok": "1|2|3|4",
                "type": "mcq|short-answer|essay",
                "count": number
            }
        ]
    }`;

    return `You are a curriculum synthesis expert. Your task is to analyze the following chat conversation between a teacher and an AI assistant and transform it into a structured JSON object.

    CONVERSATION TO ANALYZE:
    ---
    ${chatHistory}
    ---

    TARGET FORMAT REQUIRED:
    You must create a JSON object for a "${targetFormat}".
    
    - If the target is "lesson_plan", the JSON structure MUST be: ${lessonPlanStructure}. Infer all the fields from the conversation.
    - If the target is "assessment", the JSON structure MUST be: ${assessmentStructure}. Infer the topic, grade, and the teacher's desired question distribution from the conversation.

    RULES:
    1.  The output MUST be a single, valid JSON object and nothing else.
    2.  Read the entire conversation and synthesize the key ideas, topics, and activities discussed.
    3.  If a key piece of information is missing (e.g., the subject), make a reasonable assumption based on the context.
    4.  For lesson plans, ensure activities are realistic and follow Ghanaian curriculum standards.
    5.  For assessments, distribute questions across appropriate DoK levels and question types.
    `;
};

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

    try {
        const { roomId, targetFormat } = await req.json();
        if (!roomId || !targetFormat) {
            return NextResponse.json({ error: "roomId and targetFormat are required." }, { status: 400 });
        }

        // 1. Fetch the chat history
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('sender, content')
            .eq('room_id', roomId)
            .order('created_at');
        if (error) throw error;
        
        const chatHistoryString = messages.map(m => `${m.sender}: ${m.content}`).join('\n');
        
        // 2. Call the AI with the transformation prompt
        const userPrompt = getTransformationPrompt(chatHistoryString, targetFormat);
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: userPrompt }],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            response_format: { type: "json_object" },
        });

        const responseJsonString = chatCompletion.choices[0]?.message?.content;
        if (!responseJsonString) throw new Error("AI failed to synthesize the conversation.");

        const synthesizedData = JSON.parse(responseJsonString);
        return NextResponse.json(synthesizedData);

    } catch (error: any) {
        console.error("Error transforming chat:", error.message);
        return NextResponse.json({ error: "Failed to transform chat." }, { status: 500 });
    }
}
