// src/app/(dashboard)/student/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CheckCircle, Loader2 } from "lucide-react";
import Link from 'next/link';

export default function StudentDashboard() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [profile, setProfile] = useState<any>(null);
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setProfile(profileData);
                const { data: questsData } = await supabase.from('student_quests').select('*').eq('student_id', user.id).order('status');
                setQuests(questsData || []);
            }
            setLoading(false);
        };
        fetchData();
    }, [supabase]);

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    if (!profile) return <div>Could not load student profile.</div>;

    const nextQuest = quests.find(q => q.status !== 'completed');
    const completedThisWeek = quests.filter(q => q.status === 'completed' /* add date logic here */).length;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Welcome back, {profile.full_name}!</h1>
                <p className="text-gray-500">Ready for your next learning adventure?</p>
            </div>
            
            {nextQuest ? (
                <Card className="bg-gradient-to-r from-brand-primary to-orange-500 text-white">
                    <CardHeader><CardTitle>Your Next Quest</CardTitle><CardDescription className="text-orange-100">Complete this to earn XP!</CardDescription></CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <BookOpen className="h-12 w-12" />
                            <div><h3 className="font-bold text-xl">{nextQuest.title}</h3><p className="text-sm opacity-90">{nextQuest.description}</p></div>
                            <div className="ml-auto text-center"><p className="font-bold text-2xl">+{nextQuest.xp_reward}</p><p className="text-xs">XP</p></div>
                        </div>
                         <Button asChild className="mt-4 bg-white text-brand-primary hover:bg-gray-100"><Link href={`/student/quests/${nextQuest.id}`}>Start Quest <ArrowRight /></Link></Button>
                    </CardContent>
                </Card>
            ) : <p>No new quests available. Great job!</p>}

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Quests Overview</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span>Assigned Quests</span><span className="font-bold">{quests.filter(q => q.status !== 'completed').length}</span></div>
                        <div className="flex justify-between"><span>Completed This Week</span><span className="font-bold">{completedThisWeek}</span></div>
                        <Button asChild className="w-full" variant="outline"><Link href="/student/quests">View All Quests</Link></Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Recent Achievements</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* This can be made dynamic later */}
                        <p className="text-sm text-center text-gray-500">No new achievements yet. Keep learning!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}