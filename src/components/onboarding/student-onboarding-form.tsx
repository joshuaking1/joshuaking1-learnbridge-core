// src/components/onboarding/student-onboarding-form.tsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils'; // shadcn-ui utility function

const studentFormSchema = z.object({
    full_name: z.string().min(3, { message: "Full name must be at least 3 characters." }),
    date_of_birth: z.date({ required_error: "Your date of birth is required." }),
    gender: z.enum(["Male", "Female", "Other"]),
    school_name: z.string().min(3, { message: "School name is required." }),
    student_class: z.string().min(1, { message: "Your class is required (e.g., JHS 1, SHS 2)." }),
});

export function StudentOnboardingForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const role = searchParams.get('role');
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof studentFormSchema>>({
        resolver: zodResolver(studentFormSchema),
        defaultValues: { full_name: "", gender: undefined, school_name: "", student_class: "" },
    });

    async function onSubmit(values: z.infer<typeof studentFormSchema>) {
        setLoading(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error("User not found. Please log in again.");

            posthog.identify(user.id, { email: user.email, role: role, ...values });
            
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                role: role,
                updated_at: new Date().toISOString(),
                ...values
            });
            
            if(profileError) throw profileError;

            toast.success("Onboarding Complete!", {
                description: "Welcome to LearnBridgeEdu! Your learning adventure begins now.",
            });

            router.push('/student'); // Redirect to student dashboard
        } catch (error: any) {
            toast.error("Onboarding Failed", { description: error.message });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Student Onboarding</CardTitle>
                <CardDescription>Let&apos;s get you set up for your personalized learning journey.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                       <FormField control={form.control} name="full_name" render={({ field }) => (
                            <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Ama Mensah" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                        <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date of Birth</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date > new Date() || date < new Date("1950-01-01")}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}/>
                       <FormField control={form.control} name="gender" render={({ field }) => (
                            <FormItem><FormLabel>Gender</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select your gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Prefer not to say</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                       )}/>
                        <FormField control={form.control} name="school_name" render={({ field }) => (
                            <FormItem><FormLabel>Your School</FormLabel><FormControl><Input placeholder="Wesley Girls' High School" {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       <FormField control={form.control} name="student_class" render={({ field }) => (
                            <FormItem><FormLabel>Your Class</FormLabel><FormControl><Input placeholder="JHS 2, SHS 1 Gold, etc." {...field} /></FormControl><FormMessage /></FormItem>
                       )}/>
                       
                        <Button type="submit" className="w-full bg-brand-primary hover:bg-orange-600" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Start Learning
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}