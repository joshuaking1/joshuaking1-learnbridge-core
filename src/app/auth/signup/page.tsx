// src/app/auth/signup/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';

const signupFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role') || 'student';
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Load FingerprintJS on component mount
  useEffect(() => {
    const initFingerprint = async () => {
      const fp = await FingerprintJS.load({ apiKey: process.env.NEXT_PUBLIC_FINGERPRINT_JS_API_KEY! });
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    initFingerprint();
  }, []);

  const form = useForm<z.infer<typeof signupFormSchema>>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { 
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  async function onSubmit(values: z.infer<typeof signupFormSchema>) {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: values.email,
          password: values.password,
          role: role, 
          fingerprint: fingerprint 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Sign-up failed');
      }
      
      toast.success("Account created!", {
        description: "Please check your email to verify your account before logging in.",
        duration: 5000,
      });
      setSubmitted(true);
    } catch (error: any) {
      toast.error("Sign-up Error", {
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
              Create Account - {role === 'teacher' ? 'Teacher' : 'Student'}
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              {submitted
                ? "Account created! Please check your email to verify your account."
                : "Enter your details below to create your account."}
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
                          type="email"
                          placeholder="you@example.com" 
                          className="border-brand-secondary/20 focus:border-brand-primary focus:ring-brand-primary/20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-brand-secondary font-medium">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter your password" 
                          className="border-brand-secondary/20 focus:border-brand-primary focus:ring-brand-primary/20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-brand-secondary font-medium">Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Confirm your password" 
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
                    Create Account
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
                <p className="text-brand-secondary font-medium">Account Created!</p>
                <p className="text-gray-600 text-sm mt-2">Please check your email to verify your account.</p>
                <Button 
                  onClick={() => router.push(`/auth/login?role=${role}`)}
                  className="mt-4 bg-brand-primary hover:bg-brand-primary/90"
                >
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}
