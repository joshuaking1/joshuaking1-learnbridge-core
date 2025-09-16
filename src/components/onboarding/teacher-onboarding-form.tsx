// src/components/onboarding/teacher-onboarding-form.tsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/auth-helpers-nextjs';
import posthog from 'posthog-js';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

// Add Select to shadcn
// npx shadcn-ui@latest add select

const teacherFormSchema = z.object({
    full_name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
    gender: z.enum(["Male", "Female", "Other"]),
    school_name: z.string().min(3, { message: "School name is required." }),
    district: z.string().min(3, { message: "District is required." }),
    position: z.string().min(2, { message: "Position is required." }),
    experience_years: z.coerce.number().min(0, { message: "Experience must be a positive number." }),
});

export function TeacherOnboardingForm({ user, role }: { user: User, role: string }) {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof teacherFormSchema>>({
        resolver: zodResolver(teacherFormSchema),
        defaultValues: { full_name: "", gender: undefined, school_name: "", district: "", position: "", experience_years: 0 },
    });

    async function onSubmit(values: z.infer<typeof teacherFormSchema>) {
        setLoading(true);
        try {
            const userFingerprint = user.user_metadata?.fingerprint;
            
            posthog.identify(user.id, { email: user.email, role: role, ...values });
            
            const { error } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    role: role,
                    updated_at: new Date().toISOString(),
                    fingerprint: userFingerprint,
                    ...values
                });
            
            if (error) throw error;
            
            toast.success("Onboarding Complete! Redirecting...");
            router.push(`/${role}`); // Redirect to the appropriate dashboard
        } catch (error: any) {
            toast.error("Onboarding Failed", { description: error.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Teacher Onboarding</CardTitle>
                <CardDescription>Tell us a bit about yourself to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                       <FormField control={form.control} name="full_name" render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select your gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Prefer not to say</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                       )}/>
                        <FormField control={form.control} name="school_name" render={({ field }) => (
                            <FormItem><FormLabel>Current School</FormLabel><FormControl><Input placeholder="Accra High School" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       <FormField control={form.control} name="district" render={({ field }) => (
                            <FormItem><FormLabel>District</FormLabel><FormControl><Input placeholder="Ablekuma Central" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       <FormField control={form.control} name="position" render={({ field }) => (
                            <FormItem><FormLabel>Current Position / Rank</FormLabel><FormControl><Input placeholder="Class Teacher, Head of Department" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       <FormField control={form.control} name="experience_years" render={({ field }) => (
                            <FormItem><FormLabel>Years of Teaching Experience</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       
                        <Button type="submit" className="w-full bg-brand-secondary hover:bg-blue-900" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Setup
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}