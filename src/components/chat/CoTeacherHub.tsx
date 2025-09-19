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
        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-6 h-[calc(100vh-4rem)]">
            {/* Mobile Sessions Selector */}
            <div className="lg:hidden">
                <div className="flex gap-2 mb-4">
                    <Button onClick={handleNewChat} size="sm" className="flex-1">
                        <PlusCircle className="h-4 w-4 mr-2" /> New Chat
                    </Button>
                    <select 
                        value={activeSession?.id || ''} 
                        onChange={(e) => {
                            const session = sessions.find(s => s.id === e.target.value);
                            if (session) setActiveSession(session);
                        }}
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                    >
                        <option value="">Select a session...</option>
                        {sessions.map(session => (
                            <option key={session.id} value={session.id}>
                                {session.title.length > 30 ? session.title.substring(0, 30) + '...' : session.title}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Desktop Sidebar for Sessions */}
            <div className="hidden lg:flex lg:col-span-1 flex-col gap-4">
                <Button onClick={handleNewChat} size="lg"><PlusCircle className="mr-2" /> New Chat Session</Button>
                <Card className="flex-1 flex flex-col">
                    <CardHeader><CardTitle>My Sessions</CardTitle></CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {sessions.map(session => (
                            <div key={session.id} onClick={() => setActiveSession(session)} className={`p-2 rounded-md cursor-pointer transition-colors ${activeSession?.id === session.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                {session.title}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Main Chat Window */}
            <div className="flex-1 lg:col-span-3 flex flex-col bg-white rounded-lg border min-h-0">
                {activeSession ? (
                    <>
                        <div className="flex items-center justify-between p-3 lg:p-4 border-b">
                            <h2 className="text-base lg:text-lg font-bold truncate pr-2">{activeSession.title}</h2>
                            {/* Action buttons would go here */}
                        </div>
                        <ScrollArea className="flex-1 p-3 lg:p-4 min-h-0">
                            <div className="space-y-4 lg:space-y-6">
                                {messages.map(m => (
                                    <div key={m.id} className={`flex gap-2 lg:gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                                        {m.role === 'assistant' && (
                                            <Avatar className="h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0">
                                                <AvatarFallback className="text-xs lg:text-sm">AI</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={`p-2 lg:p-3 rounded-lg max-w-[85%] lg:max-w-xl prose prose-sm lg:prose ${m.role === 'user' ? 'bg-blue-500 text-white prose-invert' : 'bg-gray-100'}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm lg:text-base">{m.content}</ReactMarkdown>
                                        </div>
                                        {m.role === 'user' && (
                                            <Avatar className="h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0">
                                                <AvatarFallback className="text-xs lg:text-sm">{user.email?.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-3 lg:p-4 border-t">
                            <form onSubmit={handleSubmit}>
                                <div className="relative">
                                    <Input 
                                        value={input} 
                                        onChange={handleInputChange} 
                                        placeholder="Ask your Co-Teacher anything..." 
                                        className="pr-16 lg:pr-24" 
                                    />
                                    <div className="absolute top-1/2 right-2 -translate-y-1/2 flex gap-1 lg:gap-2">
                                        {isLoading && (
                                            <Button type="button" size="sm" variant="outline" onClick={stop} className="px-2 lg:px-3">
                                                <Square className="h-3 w-3 lg:h-4 lg:w-4 lg:mr-2" />
                                                <span className="hidden lg:inline">Stop</span>
                                            </Button>
                                        )}
                                        <Button type="submit" size="sm" disabled={isLoading} className="px-2 lg:px-3">
                                            <Send className="h-3 w-3 lg:h-4 lg:w-4" />
                                            <span className="hidden lg:inline lg:ml-2">Send</span>
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Bot className="h-12 w-12 lg:h-16 lg:w-16 text-gray-400 mb-4" />
                        <p className="text-sm lg:text-base text-gray-600">Select a session or create a new one to begin chatting with your AI Co-Teacher.</p>
                    </div>
                )}
            </div>
        </div>
    );
}