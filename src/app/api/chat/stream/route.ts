// src/app/api/chat/stream/route.ts
import { groq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

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
            },
        }
    );
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return new Response('Unauthorized', { status: 401 });

    const { messages, sessionId } = await req.json();

    // 1. Save the user's new message to the database
    const userMessage = messages[messages.length - 1];
    await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        content: userMessage.content,
        sender: 'user',
    });

    // 2. Stream the response using AI SDK
    const result = await streamText({
        model: groq('llama3-8b-8192'),
        messages,
        onFinish: async (result) => {
            // 3. When the stream is finished, save the full AI response to the database
            await supabase.from('ai_chat_messages').insert({
                session_id: sessionId,
                content: result.text,
                sender: 'assistant',
            });
        },
    });

    return result.toDataStreamResponse();
}
