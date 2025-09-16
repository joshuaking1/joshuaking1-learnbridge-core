// src/app/(dashboard)/student/quests/[questId]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Confetti from 'react-confetti';

export default function QuestPage() {
    const supabase = createClientComponentClient();
    const params = useParams();
    const router = useRouter();
    const questId = params.questId as string;
    const [quest, setQuest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    const fetchQuest = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('student_quests').select('*').eq('id', questId).single();
        if (error || !data) {
            toast.error("Could not load quest.");
            router.push('/student/quests');
        } else {
            setQuest(data);
        }
        setLoading(false);
    }, [supabase, questId, router]);

    useEffect(() => { fetchQuest(); }, [fetchQuest]);

    const handleCompleteQuest = async () => {
        setLoading(true);
        const { error } = await fetch('/api/quests', {
            method: 'POST',
            body: JSON.stringify({ questId: quest.id, xpReward: quest.xp_reward })
        });

        if (error) {
            toast.error("Failed to mark quest as complete.");
            setLoading(false);
        } else {
            setShowConfetti(true);
            toast.success(`Quest Complete! +${quest.xp_reward} XP`);
            setTimeout(() => router.push('/student'), 4000); // Celebrate for 4s then redirect
        }
    };

    if (loading || !quest) return <div className="text-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

    return (
        <>
            {showConfetti && <Confetti />}
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl">{quest.title}</CardTitle>
                    <CardDescription>{quest.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* This is where the actual lesson content or quiz would be rendered */}
                    <div className="p-8 bg-gray-100 rounded-md min-h-[300px]">
                        <p className="text-center text-gray-500">(Placeholder for lesson content or quiz component based on quest_type: '{quest.quest_type}')</p>
                    </div>
                </CardContent>
            </Card>
            <div className="mt-6 flex justify-end">
                <Button size="lg" onClick={handleCompleteQuest} disabled={loading}>
                    Mark as Complete
                </Button>
            </div>
        </>
    );
}