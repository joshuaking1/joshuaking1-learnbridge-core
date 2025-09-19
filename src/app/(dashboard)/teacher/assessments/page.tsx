// src/app/(dashboard)/teacher/assessments/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ListChecks, Grid3x3 } from 'lucide-react';

// We will create these components in the next steps
import { AssessmentGenerator } from '@/components/assessments/assessment-generator';
import { TosBuilder } from '@/components/assessments/tos-builder';
import { RubricGenerator } from '@/components/assessments/rubric-generator';

export default function AssessmentsPage() {
    return (
        <div className="flex flex-col gap-4 lg:gap-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Assessment Studio</h1>
                <p className="text-sm md:text-base text-gray-500">Design SBC-aligned assessments, tables of specification, and rubrics with AI assistance.</p>
            </div>

            <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 h-auto md:h-10">
                    <TabsTrigger value="generator" className="justify-start">
                        <FileText className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">Assessment Generator</span>
                        <span className="sm:hidden">Generator</span>
                    </TabsTrigger>
                    <TabsTrigger value="tos" className="justify-start">
                        <ListChecks className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">Table of Specs Builder</span>
                        <span className="sm:hidden">Table Builder</span>
                    </TabsTrigger>
                    <TabsTrigger value="rubric" className="justify-start">
                        <Grid3x3 className="mr-2 h-4 w-4" /> 
                        <span className="hidden sm:inline">Rubric Generator</span>
                        <span className="sm:hidden">Rubric</span>
                    </TabsTrigger>
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