// src/app/(dashboard)/teacher/page.tsx
'use client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookText, Bot, Library, ArrowRight } from "lucide-react";
import Link from 'next/link';

export default function TeacherDashboard() {
    // In the future, we'll fetch real data here: user's name, recent activity, etc.
    const teacherName = "John Doe"; // Placeholder

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, {teacherName}!</h1>
                <p className="text-gray-500 dark:text-gray-400">Here&apos;s your command center for the day. Let&apos;s make learning amazing.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookText className="h-6 w-6 text-brand-secondary" />
                            <span>AI Lesson Planner</span>
                        </CardTitle>
                        <CardDescription>
                            Generate SBC-aligned lesson plans and assessments in minutes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/teacher/lesson-planner">
                            <Button className="w-full">
                                Create a Lesson <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="h-6 w-6 text-brand-secondary" />
                            <span>AI Co-Teacher Workshop</span>
                        </CardTitle>
                        <CardDescription>
                            Build, train, and deploy personalized AI assistants for your classroom.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/teacher/co-teacher">
                            <Button className="w-full">
                                Build a Co-Teacher <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:border-brand-primary transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Library className="h-6 w-6 text-brand-secondary" />
                            <span>Resource Vault</span>
                        </CardTitle>
                        <CardDescription>
                            Upload your materials or browse a library of resources from fellow educators.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Link href="/teacher/resources">
                            <Button className="w-full" variant="secondary">
                                Explore Resources <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* We will add more sections here later, like "Recent Activity" or "Student Spotlight" */}
        </div>
    );
}