// src/app/(dashboard)/teacher/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookText, Bot, Library, ArrowRight } from "lucide-react";
import Link from 'next/link';

// This is now an async Server Component
export default async function TeacherDashboard() {
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
    if (error || !user) redirect('/auth/login');

    // **THE FIX IS HERE**
    // Fetch the user's profile on the server
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
    
    // Use the fetched name or a fallback
    const teacherName = profile?.full_name || 'Teacher';

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, {teacherName}!</h1>
                <p className="text-gray-500 dark:text-gray-400">Here's your command center for the day. Let's make learning amazing.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookText /><span>AI Lesson Planner</span></CardTitle>
                        <CardDescription>Generate SBC-aligned lesson plans and assessments in minutes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full"><Link href="/teacher/lesson-planner">Create a Lesson <ArrowRight /></Link></Button>
                    </CardContent>
                </Card>

                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bot /><span>AI Co-Teacher Workshop</span></CardTitle>
                        <CardDescription>Build, train, and deploy personalized AI assistants for your classroom.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full"><Link href="/teacher/co-teacher">Build a Co-Teacher <ArrowRight /></Link></Button>
                    </CardContent>
                </Card>

                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Library /><span>Resource Vault</span></CardTitle>
                        <CardDescription>Upload your materials or browse a library of resources.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button asChild className="w-full" variant="secondary"><Link href="/teacher/resources">Explore Resources <ArrowRight /></Link></Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}