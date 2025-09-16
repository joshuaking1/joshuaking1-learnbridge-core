// src/components/chat/CoTeacherHub.tsx
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { useChat } from '@ai-sdk/react'; // **THE CORE OF THE STREAMING UI**
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Bot, Send, User as UserIcon, Loader2, BookText, FileText, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Session = { id: string; title: string };
type Persona = { id: string; name: string };
type Message = { id: string; session_id: string; sender: 'user' | 'assistant'; content: string; created_at: string };

export function CoTeacherHub({ initialSessions, initialPersonas, user }: { initialSessions: Session[], initialPersonas: Persona[], user: User }) {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [sessions, setSessions] = useState(initialSessions);
    const [activeSession, setActiveSession] = useState<Session | null>(initialSessions[0] || null);
    const [dbMessages, setDbMessages] = useState<Message[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);

    // Vercel AI SDK hook for managing the chat state
    const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setMessages } = useChat({
        api: '/api/chat/stream',
        body: { sessionId: activeSession?.id }, // Pass the session ID to the API
        // This is called when the form is submitted
        onFinish: () => {
             // After a response is complete, refresh the server-side data
             router.refresh();
        }
    });
    
    // Fetch historical messages for the active session
    const fetchMessages = useCallback(async (session: Session) => {
        setLoadingMessages(true);
        const { data } = await supabase.from('ai_chat_messages').select('*').eq('session_id', session.id).order('created_at');
        const historicalMessages = data?.map(m => ({ id: m.id, role: m.sender, content: m.content })) || [];
        setMessages(historicalMessages as any); // Populate the AI SDK's state with history
        setLoadingMessages(false);
    }, [supabase, setMessages]);

    useEffect(() => {
        if (activeSession) {
            fetchMessages(activeSession);
        } else {
            setMessages([]);
            setLoadingMessages(false);
        }
    }, [activeSession, fetchMessages, setMessages]);

    const handleNewChat = async () => {
        const newTitle = `New Chat - ${new Date().toLocaleDateString()}`;
        
        // **THE FINAL FIX: Call our new, secure API route.**
        const promise = fetch('/api/chat-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle, personaId: null }) // personaId can be added later
        }).then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error) });
            }
            return res.json();
        });

        toast.promise(promise, {
            loading: 'Creating new session...',
            success: (newSession) => {
                setSessions([newSession, ...sessions]);
                setActiveSession(newSession);
                return "New chat session created!";
            },
            error: (err) => `Failed to create chat: ${err.message}`,
        });
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
            {/* Sidebar for Sessions and Personas */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Button onClick={handleNewChat} size="lg"><PlusCircle /> New Chat Session</Button>
                <Card className="flex-1 flex flex-col">
                    <CardHeader><CardTitle>My Sessions</CardTitle></CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {sessions.map(session => (
                            <div key={session.id} onClick={() => setActiveSession(session)} className={`p-2 rounded-md cursor-pointer ${activeSession?.id === session.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                {session.title}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Main Chat Window */}
            <div className="lg:col-span-3 flex flex-col bg-white rounded-lg border">
                {activeSession ? (
                    <>
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-bold">{activeSession.title}</h2>
                            {/* ... Buttons for Create Lesson Plan etc. would go here ... */}
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-6">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                        {m.role === 'assistant' && <Avatar><AvatarFallback>AI</AvatarFallback></Avatar>}
                                        <div className={`p-3 rounded-lg max-w-xl prose ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                        </div>
                                        {m.role === 'user' && <Avatar><AvatarFallback>{user.email?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t">
                            <form onSubmit={handleSubmit}>
                                <div className="relative">
                                    <Input value={input} onChange={handleInputChange} placeholder="Ask your Co-Teacher anything..." className="pr-24" />
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2 flex gap-2">
                                        {isLoading && <Button type="button" size="sm" variant="outline" onClick={stop}><Square className="h-4 w-4 mr-2" /> Stop</Button>}
                                        <Button type="submit" size="sm" disabled={isLoading}>Send</Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                        <p>Select a session or create a new one to begin.</p>
                    </div>
                )}
            </div>
        </div>
    );
}