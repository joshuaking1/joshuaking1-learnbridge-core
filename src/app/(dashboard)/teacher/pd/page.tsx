// src/app/(dashboard)/teacher/pd/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Lightbulb, Zap, BookOpen, Grid, Loader2, AlertTriangle } from "lucide-react";
import { toast } from 'sonner';

// Define the types for our data
type Module = {
    title: string;
    description: string;
    category: string;
    icon: 'Lightbulb' | 'Zap' | 'BookOpen' | 'Grid';
};
type PdData = {
    weeklyInsight: string;
    recommendedModules: Module[];
};

// Icon mapping component
const Icon = ({ name }: { name: Module['icon'] }) => {
    switch (name) {
        case 'Lightbulb': return <Lightbulb className="h-6 w-6 text-brand-primary" />;
        case 'Zap': return <Zap className="h-6 w-6 text-brand-primary" />;
        case 'BookOpen': return <BookOpen className="h-6 w-6 text-brand-primary" />;
        case 'Grid': return <Grid className="h-6 w-6 text-brand-primary" />;
        default: return <Lightbulb className="h-6 w-6 text-brand-primary" />;
    }
};

export default function PDCoachPage() {
    const [loading, setLoading] = useState(true);
    const [pdData, setPdData] = useState<PdData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPdData = async () => {
            try {
                const response = await fetch('/api/pd-coach');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch PD insights.");
                }
                const data = await response.json();
                setPdData(data);
            } catch (err: any) {
                setError(err.message);
                toast.error("Could not load PD recommendations.", { description: err.message });
            } finally {
                setLoading(false);
            }
        };
        fetchPdData();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-brand-primary" /></div>;
    }

    if (error || !pdData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center text-red-600 bg-red-50 rounded-md p-4">
                <AlertTriangle className="h-12 w-12 mb-2" />
                <h2 className="text-xl font-semibold">Could not load your PD Insights</h2>
                <p className="text-sm">{error || "An unknown error occurred."}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI-Powered PD Coach</h1>
                <p className="text-gray-500">Your personalized hub for professional growth, aligned with your teaching habits.</p>
            </div>

            <Card className="bg-brand-secondary text-white animate-fade-in">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bot /> Your Weekly Insight</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">{pdData.weeklyInsight}</p>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-2xl font-semibold mb-4">Recommended For You</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pdData.recommendedModules.map((rec, index) => (
                        <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <CardHeader>
                                <CardTitle className="flex items-start gap-3">
                                    <div className="p-2 bg-gray-100 rounded-md"><Icon name={rec.icon} /></div>
                                    <span>{rec.title}</span>
                                </CardTitle>
                                <CardDescription>{rec.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* ** THE FIX IS HERE ** */}
                                <Button asChild className="w-full">
                                    <Link href={`/teacher/pd/${encodeURIComponent(rec.title.toLowerCase().replace(/\s+/g, '-'))}?title=${encodeURIComponent(rec.title)}&category=${encodeURIComponent(rec.category)}`}>
                                        Start Module
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}