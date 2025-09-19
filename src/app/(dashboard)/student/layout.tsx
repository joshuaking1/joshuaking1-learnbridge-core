// src/app/(dashboard)/student/layout.tsx
import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { ServerIcon } from '@/lib/icon-map';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { UserNav } from '@/components/shared/user-nav'; // Re-using our UserNav component
import { MobileSidebar } from '@/components/shared/mobile-sidebar';

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
        { href: "/student", label: "Dashboard", iconName: "LayoutDashboard" },
        { href: "/student/quests", label: "My Quests", iconName: "Swords" },
        { href: "/student/leaderboard", label: "Leaderboard", iconName: "Trophy" },
        { href: "/student/ai-teacher", label: "My AI Teacher", iconName: "Bot" },
    ];
    
    // Simple XP calculation: level * 100
    const xpForNextLevel = (profile?.level || 1) * 100;
    const xpProgress = ((profile?.xp || 0) / xpForNextLevel) * 100;

    const studentProfileCard = (
        <div className="px-4 py-6 text-center">
            <Avatar className="h-16 w-16 lg:h-20 lg:w-20 mx-auto mb-2">
                <AvatarImage src="/placeholder-user.jpg" />
                <AvatarFallback>{profile?.full_name?.substring(0,2) || 'S'}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-base lg:text-lg">{profile?.full_name}</h3>
            <p className="text-sm text-gray-500">Rank: Scholar (Level {profile?.level})</p>
            <div className="px-2 lg:px-4 mt-4">
                <Progress value={xpProgress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">{profile?.xp} / {xpForNextLevel} XP</p>
            </div>
        </div>
    );

    const logoElement = (
        <Image 
            src="/LearnBridge logo inverted croped.png" 
            alt="LearnBridge Logo" 
            width={24} 
            height={24} 
            className="object-contain"
        />
    );

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6">
                        <Link className="flex items-center gap-2 font-semibold" href="/student">
                            {logoElement}
                            <span className="">LearnBridgeEdu</span>
                        </Link>
                    </div>
                    <div className="border-b">
                        {studentProfileCard}
                    </div>
                    <div className="flex-1 overflow-auto">
                        <nav className="flex flex-col gap-2 px-2 py-4">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900">
                                    <ServerIcon iconName={link.iconName} className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex flex-col">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-4 lg:px-6">
                    {/* Mobile Sidebar */}
                    <MobileSidebar 
                        navLinks={navLinks} 
                        title="LearnBridgeEdu"
                        logo={logoElement}
                    >
                        {studentProfileCard}
                    </MobileSidebar>
                    
                    <div className="flex-1" />
                    <UserNav userEmail={session.user.email} userName={profile?.full_name} />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}