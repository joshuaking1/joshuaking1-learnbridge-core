// src/app/(super-admin)/admin/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Bot, DollarSign } from 'lucide-react';

export default function AdminDashboardPage() {
    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users /> Total Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">1,254</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText /> Lessons Generated</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">8,621</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot /> AI Interactions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">152,789</p></CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign /> Revenue (MTD)</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₵12,500</p></CardContent></Card>
            </div>
            <Card className="col-span-1 lg:col-span-2">
                <CardHeader><CardTitle>Activity Hotspots (Placeholder)</CardTitle></CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-md">
                        <p className="text-gray-500">Charts and real-time analytics will be displayed here.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}