'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Bot, Send, User, Loader2, BookText, FileText, Trash2, Edit, MessageSquare } from 'lucide-react';
import { createClientComponentClient, User as SupabaseUser } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { useRouter } from 'next/navigation';
import { useTransformedDataStore } from '@/hooks/use-transformed-data-store';

type Message = { id: number; content: string; sender: 'user' | 'bot'; };
type ChatRoom = { id: string; title: string; };

export default function AICoTeacherPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { setPrefilledData } = useTransformedDataStore();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendLoading, setSendLoading] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const fetchChatRooms = useCallback(async (currentUser: SupabaseUser) => {
        const { data, error } = await supabase
            .from('chat_rooms')
            .select('id, title')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to load chat sessions.");
        } else {
            setChatRooms(data);
            if (data.length > 0 && !activeRoom) {
                setActiveRoom(data[0]);
            }
        }
    }, [supabase, activeRoom]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
            setUser(user);
                fetchChatRooms(user);
            } else {
                setLoading(false);
            }
        };
        getUser();
    }, [supabase, fetchChatRooms]);

    const selectChatRoom = useCallback(async (room: ChatRoom) => {
        setLoading(true);
        setActiveRoom(room);
        setMessages([]);
        const { data } = await supabase.from('chat_messages').select('*').eq('room_id', room.id).order('created_at');
        setMessages(data as Message[] || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (activeRoom) {
            selectChatRoom(activeRoom);
        } else if (user && chatRooms.length > 0) {
            selectChatRoom(chatRooms[0]);
        } else {
            setLoading(false);
        }
    }, [activeRoom, user, chatRooms, selectChatRoom]);

    const handleNewChat = async () => {
        if (!user) return;
        const newTitle = `Chat Session - ${new Date().toLocaleDateString()}`;
        const { data, error } = await supabase
            .from('chat_rooms')
            .insert({ user_id: user.id, co_teacher_id: 'general-bot', title: newTitle })
            .select('id, title')
            .single();
        if (data) {
            setChatRooms([data, ...chatRooms]);
            setActiveRoom(data);
            toast.success("New chat session created.");
        }
    };

    // Handler for transforming the chat
    const handleTransformChat = async (targetFormat: 'lesson_plan' | 'assessment') => {
        if (!activeRoom) {
            toast.error("Please select a chat session first.");
            return;
        }
        setIsTransforming(true);

        const promise = fetch('/api/transform-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: activeRoom.id, targetFormat })
        }).then(res => {
            if (!res.ok) throw new Error("Failed to synthesize conversation.");
            return res.json();
        });

        toast.promise(promise, {
            loading: `AI is synthesizing your chat into a ${targetFormat.replace('_', ' ')}...`,
            success: (data) => {
                setPrefilledData(data); // Save the result to our global store
                // Redirect to the appropriate page
                const destination = targetFormat === 'lesson_plan' ? '/teacher/lesson-planner' : '/teacher/assessments';
                router.push(destination);
                return 'Synthesis complete! Redirecting...';
            },
            error: (err) => err.message,
            finally: () => setIsTransforming(false)
        });
    };
    
    // Realtime subscription for new messages
    useEffect(() => {
        if (!activeRoom) return;
        
        const channel = supabase
            .channel('chat_messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${activeRoom.id}`
            }, (payload) => {
                const newMessage = payload.new as Message;
                setMessages(prev => [...prev, newMessage]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, activeRoom]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeRoom || !user) return;

        const userMessage: Message = {
            id: Date.now(),
            content: inputMessage,
            sender: 'user'
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setSendLoading(true);
        
        // Save user message to database
        await supabase.from('chat_messages').insert({ 
            room_id: activeRoom.id, 
            content: inputMessage,
            sender: 'user'
        });

        // Call actual AI service
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputMessage,
                    roomId: activeRoom.id,
                    chatHistory: messages.slice(-10) // Send last 10 messages for context
                })
            });

            if (!response.ok) {
                throw new Error('AI service failed');
            }

            const data = await response.json();
            const botResponse: Message = {
                id: Date.now() + 1,
                content: data.response,
                sender: 'bot'
            };

            setMessages(prev => [...prev, botResponse]);
            setSendLoading(false);

            // Save bot message to database
            await supabase.from('chat_messages').insert({
                room_id: activeRoom.id,
                content: botResponse.content,
                sender: 'bot'
            });
        } catch (error) {
            console.error('AI service error:', error);
            const errorResponse: Message = {
                id: Date.now() + 1,
                content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
                sender: 'bot'
            };

            setMessages(prev => [...prev, errorResponse]);
            setSendLoading(false);

            // Save error message to database
            await supabase.from('chat_messages').insert({
                room_id: activeRoom.id,
                content: errorResponse.content,
                sender: 'bot'
            });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Left Column: Chat Session List */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <Button onClick={handleNewChat} size="lg"><PlusCircle className="mr-2 h-5 w-5" /> New Chat</Button>
                <Card className="flex-1">
                    <CardHeader><CardTitle>My Chat Sessions</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {chatRooms.map((room) => (
                            <div key={room.id} onClick={() => setActiveRoom(room)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer ${activeRoom?.id === room.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                <p className="font-medium truncate">{room.title}</p>
                                {/* We can add delete/rename buttons here later */}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Chat Interface */}
            <div className="lg:col-span-3 flex flex-col bg-white rounded-lg border h-[calc(100vh-10rem)]">
                {activeRoom ? (
                    <>
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-4">
                                <Avatar><AvatarImage src="/bots/bot-avatar.png" /><AvatarFallback>AI</AvatarFallback></Avatar>
                                <div><h2 className="text-lg font-semibold">{activeRoom.title}</h2><p className="text-sm text-gray-500">How can I help you brainstorm today?</p></div>
                            </div>
                            {/* Create Buttons with onClick handlers */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTransformChat('lesson_plan')}
                                    disabled={isTransforming || messages.length < 2}
                                >
                                    {isTransforming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookText className="mr-2 h-4 w-4" />}
                                    Create Lesson Plan
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTransformChat('assessment')}
                                    disabled={isTransforming || messages.length < 2}
                                >
                                    {isTransforming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                    Create Assessment
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto">
                            {loading ? <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                                <div className="flex flex-col gap-4">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.sender === 'bot' && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src="/bots/bot-avatar.png" />
                                                    <AvatarFallback>AI</AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                                {msg.sender === 'bot' ? (
                                                    <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800 prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100">
                                                        <ReactMarkdown 
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeHighlight]}
                                                            components={{
                                                            code: ({ node, className, children, ...props }: any) => {
                                                                const match = /language-(\w+)/.exec(className || '');
                                                                const inline = !match;
                                                                return !inline && match ? (
                                                                    <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                                                        <code className={className} {...props}>
                                                                            {children}
                                                                        </code>
                                                                    </pre>
                                                                ) : (
                                                                    <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
                                                                        {children}
                                                                    </code>
                                                                );
                                                            },
                                                            ul: ({ children }) => (
                                                                <ul className="list-disc list-inside space-y-1 my-2">
                                                                    {children}
                                                                </ul>
                                                            ),
                                                            ol: ({ children }) => (
                                                                <ol className="list-decimal list-inside space-y-1 my-2">
                                                                    {children}
                                                                </ol>
                                                            ),
                                                            li: ({ children }) => (
                                                                <li className="text-gray-700">{children}</li>
                                                            ),
                                                            h1: ({ children }) => (
                                                                <h1 className="text-lg font-bold text-gray-800 mb-2">{children}</h1>
                                                            ),
                                                            h2: ({ children }) => (
                                                                <h2 className="text-base font-bold text-gray-800 mb-2">{children}</h2>
                                                            ),
                                                            h3: ({ children }) => (
                                                                <h3 className="text-sm font-bold text-gray-800 mb-1">{children}</h3>
                                                            ),
                                                            p: ({ children }) => (
                                                                <p className="text-gray-700 mb-2 last:mb-0">{children}</p>
                                                            ),
                                                            strong: ({ children }) => (
                                                                <strong className="font-semibold text-gray-800">{children}</strong>
                                                            ),
                                                            em: ({ children }) => (
                                                                <em className="italic text-gray-700">{children}</em>
                                                            ),
                                                            blockquote: ({ children }) => (
                                                                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-2">
                                                                    {children}
                                                                </blockquote>
                                                            ),
                                                            a: ({ children, href }) => (
                                                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                                                                    {children}
                                                                </a>
                                                            ),
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm">{msg.content}</p>
                                                )}
                                            </div>
                                            {msg.sender === 'user' && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                    ))}
                                    {sendLoading && (
                                        <div className="flex gap-3 justify-start">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src="/bots/bot-avatar.png" />
                                                <AvatarFallback>AI</AvatarFallback>
                                            </Avatar>
                                            <div className="bg-gray-100 p-3 rounded-lg">
                                                <p className="text-sm">Thinking...</p>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>
                        <form onSubmit={handleSendMessage} className="p-4 border-t">
                            <div className="relative">
                                <Input 
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    placeholder="Ask your AI Co-Teacher anything..."
                                    disabled={loading || sendLoading}
                                    className="pr-12"
                                />
                                <Button type="submit" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2" disabled={loading || sendLoading || !inputMessage.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold">Select a session or start a new one.</h3>
                        <p className="text-gray-500">Your brainstorming sessions with the AI Co-Teacher will be saved here.</p>
                        <Button onClick={handleNewChat} className="mt-4">Start a New Chat</Button>
                    </div>
                )}
            </div>
        </div>
    );
}