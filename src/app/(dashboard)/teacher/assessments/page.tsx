// src/app/(dashboard)/teacher/assessments/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ListChecks, Grid3x3 } from 'lucide-react';

// We will create these components in the next steps
import { AssessmentGenerator } from '@/components/assessments/assessment-generator';
import { TosBuilder } from '@/components/assessments/tos-builder';
import { RubricGenerator } from '@/components/assessments/rubric-generator';

export default function AssessmentsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Assessment Studio</h1>
                <p className="text-gray-500">Design SBC-aligned assessments, tables of specification, and rubrics with AI assistance.</p>
            </div>

            <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="generator"><FileText className="mr-2 h-4 w-4" /> Assessment Generator</TabsTrigger>
                    <TabsTrigger value="tos"><ListChecks className="mr-2 h-4 w-4" /> Table of Specs Builder</TabsTrigger>
                    <TabsTrigger value="rubric"><Grid3x3 className="mr-2 h-4 w-4" /> Rubric Generator</TabsTrigger>
                </TabsList>
                
                <TabsContent value="generator" className="mt-4">
                    <AssessmentGenerator />
                </TabsContent>
                <TabsContent value="tos" className="mt-4">
                    <TosBuilder />
                </TabsContent>
                <TabsContent value="rubric" className="mt-4">
                    <RubricGenerator />
                </TabsContent>
            </Tabs>
        </div>
    );
}