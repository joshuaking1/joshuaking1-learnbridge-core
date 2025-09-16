// src/app/redirecting/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectingPage() {
    const router = useRouter();

    // This effect will run on the client after the session has been set by the callback.
    // It then pushes the user to a protected route, letting the middleware take over.
    useEffect(() => {
        router.push('/student'); // Push to a generic protected route
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-4">Redirecting...</p>
        </div>
    );
}
