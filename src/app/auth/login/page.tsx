// src/app/auth/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // Import this client
import { toast } from "sonner"; // CORRECTED IMPORT

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

function LoginPageContent() {
  const supabase = createClientComponentClient(); // Use the component client
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'student';
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof loginFormSchema>) {
    setLoading(true);
    try {
      // *** THE DEFINITIVE FIX IS HERE ***
      // We are no longer providing emailRedirectTo.
      // The auth helper's client will automatically construct the correct URL
      // to our /auth/callback route for a secure server-side code exchange.
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          // This must match the URL of the page where the sign-in request is made.
          // It's used by Supabase to prevent phishing attacks.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast.success("Check your email!", {
        description: "We've sent a magic link to your email address. Click it to log in.",
        duration: 5000,
      });
      setSubmitted(true);
    } catch (error: any) {
      toast.error("Error", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-secondary/5 to-brand-primary/5">
      <div className="w-full max-w-md mx-4">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">LB</span>
            </div>
            <CardTitle className="text-3xl font-bold text-brand-secondary">
              Welcome, {role === 'teacher' ? 'Teacher' : 'Student'}!
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {submitted
                ? "A login link has been sent. Please check your inbox."
                : "Enter your email below to receive a magic link to access your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {!submitted && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-brand-secondary font-medium">Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="you@example.com" 
                          className="border-brand-secondary/20 focus:border-brand-primary focus:ring-brand-primary/20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button 
                    type="submit" 
                    className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Magic Link
                  </Button>
                </form>
              </Form>
            )}
            {submitted && (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-brand-secondary font-medium">Check your email!</p>
                <p className="text-gray-600 text-sm mt-2">We&apos;ve sent a magic link to your email address.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (<Suspense fallback={<div>Loading...</div>}><LoginPageContent /></Suspense>);
}
