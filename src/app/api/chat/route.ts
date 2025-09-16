import Groq from 'groq-sdk';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
        const { message, roomId, chatHistory } = await req.json();
        
        if (!message || !roomId) {
            return NextResponse.json({ error: "Message and roomId are required." }, { status: 400 });
        }

        // Build context from chat history
        const contextMessages = chatHistory?.map((msg: { sender: string; content: string }) => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.content
        })) || [];

        // Create the AI prompt for educational assistance
        const systemPrompt = `You are an AI Co-Teacher assistant for Ghanaian educators. Your role is to help teachers brainstorm, plan lessons, create assessments, and solve educational challenges. 

Key guidelines:
- Provide practical, actionable advice for Ghanaian curriculum (GES standards)
- Be encouraging and supportive
- Ask clarifying questions when needed
- Suggest specific activities, resources, or teaching strategies
- Consider different learning styles and abilities
- Reference Ghanaian educational context when relevant
- Keep responses concise but comprehensive
- Be professional yet friendly
- Use markdown formatting for better readability (headings, lists, bold text, code blocks, etc.)

Format your responses using markdown:
- Use **bold** for emphasis
- Use *italics* for important points
- Use # Headings for main topics
- Use - or * for bullet points
- Use numbered lists for step-by-step instructions
- Use \`code\` for technical terms or examples
- Use > blockquotes for important quotes or tips
- Use [links](url) for external resources

Respond as a helpful teaching colleague who understands the Ghanaian educational system.`;

        // Add the current user message
        const messages = [
            { role: "system", content: systemPrompt },
            ...contextMessages,
            { role: "user", content: message }
        ];

        // Call Groq AI
        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature: 0.7,
            max_tokens: 1000,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content;
        
        if (!aiResponse) {
            throw new Error("AI failed to generate response");
        }

        return NextResponse.json({ response: aiResponse });

    } catch (error: unknown) {
        console.error("Error in chat API:", error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ 
            error: "Failed to process your message. Please try again." 
        }, { status: 500 });
    }
}