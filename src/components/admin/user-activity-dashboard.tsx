// src/components/admin/user-activity-dashboard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Bot, MessageSquare, BookOpen, CheckSquare, ListChecks, Grid3x3 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon }: { title: string, value: number, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const ActivityItem = ({ type, description, date, icon }: { type: string, description: string, date: string, icon: string }) => {
    const iconMap: Record<string, React.ElementType> = {
        FileText,
        Bot,
        MessageSquare,
        BookOpen,
        CheckSquare,
        ListChecks,
        Grid3x3
    };
    
    const Icon = iconMap[icon] || FileText;
    
    return (
        <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-full">
                <Icon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
                <p className="font-medium">{type}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <p className="text-sm text-gray-500 ml-auto flex-shrink-0">{new Date(date).toLocaleDateString()}</p>
        </div>
    );
};


export function UserActivityDashboard({ stats, activityLog }: { stats: any, activityLog: any[] }) {
    if (!stats) return <p>Could not load user activity stats.</p>;

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Lesson Plans" value={stats.lesson_plans} icon={BookOpen} />
                <StatCard title="Assessments" value={stats.assessments} icon={FileText} />
                <StatCard title="Forum Posts" value={stats.forum_posts} icon={MessageSquare} />
                <StatCard title="PD Modules Completed" value={stats.pd_completed} icon={CheckSquare} />
                <StatCard title="Rubrics Created" value={stats.rubrics} icon={Grid3x3} />
                <StatCard title="ToS Created" value={stats.tos} icon={ListChecks} />
                <StatCard title="Chat Sessions" value={stats.chat_sessions} icon={Bot} />
                <StatCard title="Forum Replies" value={stats.forum_replies} icon={MessageSquare} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {activityLog.length > 0 ? (
                        activityLog.map((item, index) => <ActivityItem key={index} {...item} />)
                    ) : (
                        <p className="text-center text-gray-500">No recent activity to display.</p>
                    )}
                </CardContent>
            </Card>
        </>
    );
}