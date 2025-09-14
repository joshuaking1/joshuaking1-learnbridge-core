// src/app/(dashboard)/teacher/progress/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, BarChart2, AlertCircle } from 'lucide-react';

export default function StudentProgressPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Student Progress Tracker</h1>
                    <p className="text-gray-500">Monitor engagement and performance across your classes.</p>
                </div>
                <div className="flex gap-2">
                    <Select defaultValue="jhs1">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="jhs1">JHS 1</SelectItem>
                            <SelectItem value="jhs2">JHS 2</SelectItem>
                            <SelectItem value="shs1-gold">SHS 1 Gold</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users /> Total Students</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">45</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="text-green-500" /> Active This Week</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">38</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 className="text-blue-500" /> Avg. Quiz Score</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">78%</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="text-red-500" /> Needs Attention</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">4</p></CardContent></Card>
            </div>
            
            <Card>
                <CardHeader><CardTitle>Performance Overview (Placeholder)</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-md">
                        <p className="text-gray-500">Detailed charts and student lists will be displayed here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}