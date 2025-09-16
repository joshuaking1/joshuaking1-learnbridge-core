// src/app/(dashboard)/student/layout.tsx
import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Swords, Trophy, Bot, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { UserNav } from '@/components/shared/user-nav'; // Re-using our UserNav component

export default async function StudentDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                set(name, value, options) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name, options) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect('/auth/login?role=student');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, xp, level')
        .eq('id', session.user.id)
        .single();

    const navLinks = [
        { href: "/student", label: "Dashboard", icon: LayoutDashboard },
        { href: "/student/quests", label: "My Quests", icon: Swords },
        { href: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/student/ai-teacher", label: "My AI Teacher", icon: Bot },
    ];
    
    // Simple XP calculation: level * 100
    const xpForNextLevel = (profile?.level || 1) * 100;
    const xpProgress = ((profile?.xp || 0) / xpForNextLevel) * 100;

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6">
                        <Link className="flex items-center gap-2 font-semibold" href="/student">
                            <Bot className="h-6 w-6 text-brand-primary" />
                            <span className="">LearnBridgeEdu</span>
                        </Link>
                    </div>
                    {/* Student Profile Card */}
                    <div className="px-4 py-6 text-center border-b">
                        <Avatar className="h-20 w-20 mx-auto mb-2"><AvatarImage src="/placeholder-user.jpg" /><AvatarFallback>{profile?.full_name?.substring(0,2) || 'S'}</AvatarFallback></Avatar>
                        <h3 className="font-semibold text-lg">{profile?.full_name}</h3>
                        <p className="text-sm text-gray-500">Rank: Scholar (Level {profile?.level})</p>
                        <div className="px-4 mt-4">
                            <Progress value={xpProgress} className="h-2" />
                            <p className="text-xs text-gray-500 mt-1">{profile?.xp} / {xpForNextLevel} XP</p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <nav className="flex flex-col gap-2 px-2 py-4">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900">
                                    <link.icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6">
                    <div className="w-full flex-1">{/* Mobile Menu Button can go here */}</div>
                    <UserNav userEmail={session.user.email} userName={profile?.full_name} />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}