// src/app/onboarding/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TeacherOnboardingForm } from '@/components/onboarding/teacher-onboarding-form';
import { StudentOnboardingForm } from '@/components/onboarding/student-onboarding-form'; // IMPORT THE NEW COMPONENT

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {role === 'teacher' && <TeacherOnboardingForm />}
        {role === 'student' && <StudentOnboardingForm />} {/* ADD THE RENDER LOGIC */}
        {!role && (
            <div className="text-center p-8 bg-white rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-red-600">Error</h1>
                <p className="mt-2 text-gray-600">User role not specified. Please go back to the home page and select a role.</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage(){
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading onboarding...</div>}>
      <OnboardingPageContent />
    </Suspense>
  )
}