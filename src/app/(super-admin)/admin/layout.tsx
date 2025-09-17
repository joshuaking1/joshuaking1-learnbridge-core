// src/app/(super-admin)/admin/layout.tsx
import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Shield, Home, Users, MessageSquare, BookCopy, Cpu, Swords } from 'lucide-react';
import { UserNav } from '@/components/shared/user-nav';

// Note: The middleware already protects this layout, but we re-fetch the
// session and profile here to pass data to components like UserNav.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
    const { data: { session } } = await supabase.auth.getSession();
    
    // Safety check - middleware should handle this, but just in case
    if (!session) {
        redirect('/auth/login');
    }
    
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();

    const navLinks = [
        { href: "/admin", label: "Dashboard", icon: Home },
        { href: "/admin/users", label: "User Management", icon: Users },
        { href: "/admin/content", label: "Content Moderation", icon: MessageSquare },
        { href: "/admin/curriculum", label: "Curriculum", icon: BookCopy },
        { href: "/admin/ai-monitor", label: "AI Monitor", icon: Cpu },
        { href: "/admin/quests", label: "Quest Authoring", icon: Swords },
    ];

    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-gray-900 text-white lg:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b border-gray-700 px-6">
                        <Link className="flex items-center gap-2 font-semibold" href="/admin">
                            <Shield className="h-6 w-6 text-brand-primary" />
                            <span>Super Admin</span>
                        </Link>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <nav className="flex flex-col gap-2 px-2 py-4">
                            {navLinks.map((link) => (
                                <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:bg-gray-800 hover:text-white">
                                    <link.icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            </div>
            <div className="flex flex-col">
                <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100 px-6">
                    <div className="w-full flex-1">
                        <h1 className="text-lg font-semibold">LearnBridgeEdu Command Center</h1>
                    </div>
                    <UserNav userEmail={session.user.email} userName={profile?.full_name} />
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gray-50">
                    {children}
                </main>
            </div>
        </div>
    );
}