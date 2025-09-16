// src/app/(dashboard)/teacher/layout.tsx
import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Bot, LayoutDashboard, BookText, FileText, Library, LineChart, BarChart, MessageSquare } from 'lucide-react';
import { UserNav } from '@/components/shared/user-nav'; // We will create this component next

export default async function TeacherDashboardLayout({
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

    // The Core Auth Guard Logic
    if (!session) {
        // If no session is found, redirect to the login page immediately.
        redirect('/auth/login?role=teacher');
    }

    // If a session exists, fetch the user's profile for the UserNav component
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
    
    const navLinks = [
        { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
        { href: "/teacher/lesson-planner", label: "Lesson Planner", icon: BookText },
        { href: "/teacher/assessments", label: "Assessments", icon: FileText },
        { href: "/teacher/co-teacher", label: "AI Co-Teacher", icon: Bot },
        { href: "/teacher/resources", label: "Resource Vault", icon: Library },
        { href: "/teacher/progress",label: "Student Progress", icon: LineChart },
        { href: "/teacher/pd", label: "PD Coach", icon: BarChart },
        { href: "/teacher/plc-forum", label: "PLC Forum", icon: MessageSquare },
    ];

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6">
                        <Link className="flex items-center gap-2 font-semibold" href="/teacher">
                            <Bot className="h-6 w-6 text-brand-primary" />
                            <span className="">LearnBridgeEdu</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <nav className="flex flex-col gap-2 px-2 py-4">
                            {navLinks.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.href}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
                                >
                                    <link.icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
                    <div className="w-full flex-1">
                        {/* Future search bar can go here */}
                    </div>
                    <UserNav userEmail={session.user.email} userName={profile?.full_name} />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
                    {children}
                </main>
            </div>
        </div>
    );
}