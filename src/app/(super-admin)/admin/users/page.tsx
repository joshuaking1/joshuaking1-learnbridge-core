// src/app/(super-admin)/admin/users/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserManagementClient } from '@/components/admin/user-management-client';

export default async function UserManagementPage() {
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

    // **THE FIX: Call the secure RPC function to get the user list**
    const { data: users, error } = await supabase
        .rpc('get_all_users_with_profiles');
    
    if (error) {
        console.error("Error fetching users via RPC:", error);
        return <div className="text-red-500">Error fetching user data. The RPC function may have failed.</div>;
    }

    return <UserManagementClient initialUsers={users || []} />;
}