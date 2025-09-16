// src/app/(dashboard)/student/quests/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Edit, Check, Loader2 } from "lucide-react";
import Link from 'next/link';
import { toast } from 'sonner';

// Type definitions for Quest
interface Quest {
    id: number;
    title: string;
    quest_type: string;
    xp_reward: number;
    status: 'assigned' | 'in_progress' | 'completed';
    assigned_at: string;
}

export default function MyQuestsPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQuests = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('student_quests')
            .select('*')
            .order('status', { ascending: true })
            .order('assigned_at', { ascending: false });
        if (error) { 
            toast.error("Failed to load quests."); 
        } else { 
            setQuests(data || []); 
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => { 
        fetchQuests(); 
    }, [fetchQuests]);

    const getIcon = (type: string) => {
        if (type === 'quiz') return <Edit className="h-6 w-6" />;
        return <BookOpen className="h-6 w-6" />;
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">My Quests</h1>
                <p className="text-gray-500">Complete these tasks to earn XP!</p>
            </div>
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {quests.map(quest => (
                                <li key={quest.id} className={`flex items-center gap-4 p-4 ${quest.status === 'completed' ? 'opacity-50' : ''}`}>
                                    <div className={`p-3 rounded-full ${quest.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {quest.status === 'completed' ? <Check className="h-6 w-6" /> : getIcon(quest.quest_type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{quest.title}</p>
                                        <p className="text-sm text-gray-500 capitalize">{quest.quest_type} • +{quest.xp_reward} XP</p>
                                    </div>
                                    <div>
                                        {quest.status === 'completed' ? (
                                            <Button variant="ghost" disabled>Completed</Button>
                                        ) : (
                                            <Button asChild>
                                                <Link href={`/student/quests/${quest.id}`}>
                                                    {quest.status === 'in_progress' ? 'Continue' : 'Start Quest'}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}