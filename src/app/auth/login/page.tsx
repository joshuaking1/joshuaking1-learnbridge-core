// src/app/auth/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Image from 'next/image';

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

function LoginPageContent() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role') || 'student';
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { 
      email: "",
      password: ""
    },
  });

  async function onSubmit(values: z.infer<typeof loginFormSchema>) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success("Login successful!", {
        description: "Redirecting to your dashboard...",
        duration: 3000,
      });
      
      router.push('/redirecting');
    } catch (error: any) {
      toast.error("Login Error", {
        description: error.message || "Invalid email or password. Please try again.",
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
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center p-2">
              <Image 
                src="/LearnBridge logo inverted croped.png" 
                alt="LearnBridge Logo" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>
            <CardTitle className="text-3xl font-bold text-brand-secondary">
              Welcome, {role === 'teacher' ? 'Teacher' : 'Student'}!
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Enter your email and password to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
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
                
                <Button 
                  type="submit" 
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <a 
                  href={`/auth/signup?role=${role}`}
                  className="text-brand-primary hover:text-brand-primary/80 font-medium"
                >
                  Sign up here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (<Suspense fallback={<div>Loading...</div>}><LoginPageContent /></Suspense>);
}
