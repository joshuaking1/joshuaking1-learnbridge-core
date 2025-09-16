// src/app/api/chat/stream/route.ts
import Groq from 'groq-sdk';
import { GroqStream, StreamingTextResponse } from 'ai';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

    // 2. Call Groq for the streaming response
    const response = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        stream: true,
        messages,
    });

    // 3. Stream the response back to the client
    const stream = GroqStream(response, {
        async onCompletion(completion) {
            // 4. When the stream is finished, save the full AI response to the database
            await supabase.from('ai_chat_messages').insert({
                session_id: sessionId,
                content: completion,
                sender: 'assistant',
            });
        },
    });

    return new StreamingTextResponse(stream);
}
