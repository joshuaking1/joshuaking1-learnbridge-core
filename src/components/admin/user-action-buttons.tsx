// src/components/admin/user-action-buttons.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Shield, Ban, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

type UserProfile = {
    id: string;
    platform_role: string;
    is_suspended: boolean;
}

export function UserActionButtons({ profile }: { profile: UserProfile }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAction = async (action: string, payload: any) => {
        setLoading(true);

        const promise = fetch('/api/admin/actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, targetUserId: profile.id, payload }),
        }).then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
            return res.json();
        });

        toast.promise(promise, {
            loading: 'Performing administrative action...',
            success: (data) => {
                router.refresh(); // Re-fetch server component data to show changes
                return data.message;
            },
            error: (err) => err.message,
            finally: () => setLoading(false)
        });
    };

    const handleToggleSuspension = () => {
        handleAction('toggle_suspension', { is_suspended: !profile.is_suspended });
    };

    const handleMakeAdmin = () => {
        // This is a dangerous action, so we could add a confirmation dialog later
        handleAction('update_role', { newRole: 'SUPER_ADMIN' });
    };
    
    const handleRemoveAdmin = () => {
        handleAction('update_role', { newRole: 'user' });
    };

    return (
        <div className="flex flex-wrap gap-4">
            {profile.platform_role === 'SUPER_ADMIN' ? (
                <Button onClick={handleRemoveAdmin} disabled={loading} variant="outline"><Shield className="mr-2 h-4 w-4"/> Revoke Admin</Button>
            ) : (
                <Button onClick={handleMakeAdmin} disabled={loading}><Shield className="mr-2 h-4 w-4"/> Make Admin</Button>
            )}
            
            <Button onClick={handleToggleSuspension} disabled={loading} variant="destructive">
                <Ban className="mr-2 h-4 w-4"/>
                {profile.is_suspended ? 'Un-suspend User' : 'Suspend User'}
            </Button>
            <Button variant="secondary" disabled><KeyRound className="mr-2 h-4 w-4"/> Impersonate (Soon)</Button>
        </div>
    );
}