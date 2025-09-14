// src/app/(dashboard)/student/page.tsx
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, CheckCircle } from "lucide-react";
import Link from 'next/link';

// Placeholder data - we'll fetch this from the database later
const currentQuest = {
    title: "Lesson: The Basics of Photosynthesis",
    description: "Understand how plants create their own food using sunlight.",
    quest_type: 'lesson',
    xp_reward: 20,
};

const recentAchievements = [
    { title: "Quiz Champion", description: "Scored 90% on the Water Cycle quiz." },
    { title: "Day 3 Streak", description: "Logged in for 3 days in a row." },
];

export default function StudentDashboard() {
    const studentName = "Ama"; // We'll get this from the profile later

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, {studentName}!</h1>
                <p className="text-gray-500">Ready for your next learning adventure?</p>
            </div>
            
            {/* Current Quest Card */}
            <Card className="bg-gradient-to-r from-brand-primary to-orange-500 text-white">
                <CardHeader>
                    <CardTitle>Your Next Quest</CardTitle>
                    <CardDescription className="text-orange-100">Complete this to earn XP and level up!</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <BookOpen className="h-12 w-12 flex-shrink-0" />
                        <div>
                            <h3 className="font-bold text-xl">{currentQuest.title}</h3>
                            <p className="text-sm opacity-90">{currentQuest.description}</p>
                        </div>
                        <div className="ml-auto text-center">
                            <p className="font-bold text-2xl">+{currentQuest.xp_reward}</p>
                            <p className="text-xs">XP</p>
                        </div>
                    </div>
                     <Button asChild className="mt-4 bg-white text-brand-primary hover:bg-gray-100">
                        <Link href="/student/quests">
                            Start Quest <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                 {/* My Quests Summary */}
                <Card>
                    <CardHeader><CardTitle>Quests Overview</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span>Assigned Quests</span><span className="font-bold">5</span></div>
                        <div className="flex justify-between"><span>Completed This Week</span><span className="font-bold">2</span></div>
                        <Button asChild className="w-full" variant="outline"><Link href="/student/quests">View All Quests</Link></Button>
                    </CardContent>
                </Card>
                {/* Recent Achievements */}
                 <Card>
                    <CardHeader><CardTitle>Recent Achievements</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       {recentAchievements.map((ach, i) => (
                           <div key={i} className="flex items-center gap-3">
                               <CheckCircle className="h-5 w-5 text-green-500" />
                               <div>
                                   <p className="font-semibold">{ach.title}</p>
                                   <p className="text-sm text-gray-500">{ach.description}</p>
                               </div>
                           </div>
                       ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}