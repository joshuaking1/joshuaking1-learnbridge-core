// src/app/(super-admin)/admin/users/[userId]/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Ban, KeyRound, FileText, Bot, MessageSquare, BookOpen, CheckSquare, ListChecks, Grid3x3 } from 'lucide-react';
import { UserActionButtons } from '@/components/admin/user-action-buttons';

// A new component we will create
import { UserActivityDashboard } from '@/components/admin/user-activity-dashboard';

export default async function UserDetailPage({ params }: { params: { userId: string } }) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookies().getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookies().set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
    const userId = params.userId;

    // Fetch all data in parallel for performance
    const [profileRes, statsRes, recentLessonsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.rpc('get_user_activity_stats', { user_id_input: userId }),
        supabase.from('lesson_plans').select('subject, created_at').eq('author_id', userId).order('created_at', { ascending: false }).limit(5)
    ]);

    const { data: profile } = profileRes;
    const { data: stats } = statsRes;
    const { data: recentLessons } = recentLessonsRes;
    
    if (!profile) {
        notFound();
    }

    // Combine recent activities into a single log (can be expanded later)
    const activityLog = recentLessons?.map(l => ({
        type: 'Lesson Plan',
        description: `Created a lesson plan for "${l.subject}"`,
        date: l.created_at,
        icon: 'FileText'
    })) || [];


    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <User className="h-12 w-12" />
                <div>
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <p className="text-gray-500">{profile.email}</p>
                </div>
            </div>

            {/* Pass all fetched data to the new client component */}
            <UserActivityDashboard stats={stats} activityLog={activityLog} />

            <Card>
                <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><strong>Role:</strong> <Badge variant="secondary">{profile.platform_role}</Badge></div>
                    <div><strong>Status:</strong> <Badge variant={profile.is_suspended ? 'destructive' : 'default'}>{profile.is_suspended ? 'Suspended' : 'Active'}</Badge></div>
                    <div><strong>School:</strong> {profile.school_name || 'N/A'}</div>
                    <div><strong>Class:</strong> {profile.student_class || 'N/A'}</div>
                    <div><strong>Experience (Teacher):</strong> {profile.experience_years || 'N/A'}</div>
                    <div><strong>User ID:</strong> <code className="text-xs">{profile.id}</code></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader><CardTitle>Administrative Actions</CardTitle></CardHeader>
                <CardContent><UserActionButtons profile={profile} /></CardContent>
            </Card>
        </div>
    );
}