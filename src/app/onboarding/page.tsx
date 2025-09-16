// src/app/onboarding/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TeacherOnboardingForm } from '@/components/onboarding/teacher-onboarding-form';
import { StudentOnboardingForm } from '@/components/onboarding/student-onboarding-form';
import { Suspense } from 'react';

// This is now an async Server Component
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { role: string };
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
  const role = searchParams.role;

  // 1. Server-side session check
  if (!session) {
    // If there's no session, they don't belong here.
    redirect('/auth/login');
  }
  
  // 2. Server-side role check
  if (!role) {
    // If the role is missing, redirect home to be safe.
    redirect('/');
  }

  // 3. Check if the user ALREADY has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', session.user.id)
    .single();

  if (profile) {
    // If they already have a profile, they don't belong here. Send them to their dashboard.
    redirect(`/${role}`);
  }

  // If all checks pass, render the client component with the form
  // and pass the user object and role as props.
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Suspense fallback={<div>Loading Form...</div>}>
          {role === 'teacher' && <TeacherOnboardingForm user={session.user} role={role} />}
          {role === 'student' && <StudentOnboardingForm user={session.user} role={role} />}
        </Suspense>
      </div>
    </div>
  );
}