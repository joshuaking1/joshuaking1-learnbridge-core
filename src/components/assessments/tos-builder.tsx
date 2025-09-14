'use client';
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wand2, Loader2, PlusCircle, Trash2, FileDown, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

// **NEW: Zod schema for validation**
const tosSchema = z.object({
    subject: z.string().min(3, { message: "Subject is required." }),
    termWeeks: z.coerce.number().min(1, { message: "Term weeks are required." }),
    focalAreas: z.array(z.object({
        weekRange: z.string().min(1, { message: "Week range is required." }),
        areas: z.string().min(5, { message: "Focal area description is required." })
    })).min(1, { message: "At least one focal area group is required." })
});


export function TosBuilder() {
    const [loading, setLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState<{ tosId: string, tosData: any[] } | null>(null);
    const [apiError, setApiError] = useState<string | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');

    const { register, control, handleSubmit, getValues, formState: { errors } } = useForm({
        resolver: zodResolver(tosSchema), // Use the zod resolver
        defaultValues: {
            subject: "Art and Design Studio",
            termWeeks: 6,
            focalAreas: [
                { weekRange: "1-2", areas: "1. Introduction to Art and Design\n2. Color Theory\n3. Basic Drawing" },
                { weekRange: "3-4", areas: "1. Art Movements\n2. Design Principles\n3. Art Criticism" },
                { weekRange: "5-6", areas: "1. Studio Practice\n2. Project Development\n3. Art and Design in Society" }
            ]
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "focalAreas" });

    const handleGenerate = async (data: any, isRefinement = false) => {
        setLoading(true);
        if (!isRefinement) setGeneratedData(null);
        setApiError(null);

        const promise = fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                generationType: 'tos',
                ...data,
                refinement_prompt: isRefinement ? refinementPrompt : ''
            })
        }).then(async (res) => {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "An unknown API error occurred.");
            }
            return res.json();
        });

        toast.promise(promise, {
            loading: isRefinement ? 'Regenerating blueprint...' : 'Generating blueprint...',
            success: (result) => {
                if (result && result.tosId && result.tosData) {
                    setGeneratedData(result);
                    return 'ToS generated and saved successfully!';
                } else {
                    throw new Error("API returned an invalid response.");
                }
            },
            error: (err) => { setApiError(err.message); return err.message; },
            finally: () => setLoading(false)
        });
    };

    const handleExport = async () => {
        if (!generatedData) return;
        const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
        doc.setFontSize(16).setFont('helvetica', 'bold').text(`Table of Specification - ${getValues('subject')}`, 148.5, 15, { align: 'center' });
        doc.setFontSize(11).setFont('helvetica', 'normal').text('End of term exams', 148.5, 22, { align: 'center' });

        const tableData = generatedData.tosData.flatMap(week => 
            week.questionDistribution.map((dist, index) => {
                const rowTotal = (dist.dok1 || 0) + (dist.dok2 || 0) + (dist.dok3 || 0) + (dist.dok4 || 0);
                if (index === 0) {
                    return [
                        { content: week.weekRange, rowSpan: week.questionDistribution.length, styles: { valign: 'middle', fontStyle: 'bold' } },
                        { content: week.focalAreas, rowSpan: week.questionDistribution.length, styles: { valign: 'middle' } },
                        dist.type, dist.dok1 || '-', dist.dok2 || '-', dist.dok3 || '-', dist.dok4 || '-', rowTotal
                    ];
                }
                return [dist.type, dist.dok1 || '-', dist.dok2 || '-', dist.dok3 || '-', dist.dok4 || '-', rowTotal];
            })
        );
        
        autoTable(doc, {
            startY: 30,
            head: [['Week', 'Focal Area(s)', 'Type', 'DoK 1', 'DoK 2', 'DoK 3', 'DoK 4', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [2, 46, 125] }, // Brand color
            didParseCell: (data: any) => { // Handle row spans
                if (data.cell.raw.rowSpan) { data.cell.rowSpan = data.cell.raw.rowSpan; }
            }
        });
        
        // Add verification footer with QR code
        const verificationUrl = `${window.location.origin}/verify/tos?id=${generatedData.tosId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 20, margin: 1 });
        const finalY = (doc as any).lastAutoTable.finalY || 200;
        doc.addImage(qrCodeDataUrl, 'PNG', 15, finalY + 5);
        doc.setFontSize(7).text("Generated by LearnBridgeEdu.com", 40, finalY + 12);
        doc.text(`Verify authenticity: ${verificationUrl}`, 40, finalY + 16);
        
        doc.save(`ToS - ${getValues('subject')}.pdf`);
    };

    const totals = generatedData?.tosData?.reduce((acc, week) => {
        week.questionDistribution.forEach(dist => {
            acc.dok1 += dist.dok1 || 0;
            acc.dok2 += dist.dok2 || 0;
            acc.dok3 += dist.dok3 || 0;
            acc.dok4 += dist.dok4 || 0;
        });
        return acc;
    }, { dok1: 0, dok2: 0, dok3: 0, dok4: 0 });
    const grandTotal = totals ? totals.dok1 + totals.dok2 + totals.dok3 + totals.dok4 : 0;

    return (
        <Card>
            <CardHeader><CardTitle>End of Term ToS Builder</CardTitle><CardDescription>Define your term&apos;s focal areas to generate a professional exam blueprint.</CardDescription></CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(data => handleGenerate(data, false))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Subject</Label>
                            <Input {...register("subject")} />
                            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Total Weeks in Term</Label>
                            <Input type="number" {...register("termWeeks")} />
                            {errors.termWeeks && <p className="text-xs text-red-500 mt-1">{errors.termWeeks.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="font-semibold">Focal Areas by Week</Label>
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md border">
                                <div className="w-24 space-y-1">
                                    <Label className="text-xs">Weeks</Label>
                                    <Input placeholder="1-2" {...register(`focalAreas.${index}.weekRange`)} />
                                    {errors.focalAreas?.[index]?.weekRange && <p className="text-xs text-red-500 mt-1">{errors.focalAreas?.[index]?.weekRange?.message}</p>}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs">Focal Area(s) (one per line)</Label>
                                    <Textarea className="min-h-[80px]" {...register(`focalAreas.${index}.areas`)} />
                                    {errors.focalAreas?.[index]?.areas && <p className="text-xs text-red-500 mt-1">{errors.focalAreas?.[index]?.areas?.message}</p>}
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="mt-5" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                        ))}
                        {errors.focalAreas && <p className="text-xs text-red-500 mt-1">{errors.focalAreas.message}</p>}
                        <Button type="button" variant="outline" onClick={() => append({ weekRange: "", areas: "" })}><PlusCircle className="mr-2 h-4 w-4" /> Add Week Group</Button>
                    </div>

                    <div className="flex justify-end pt-4 border-t"><Button size="lg" type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Generate Blueprint</Button></div>
                </form>

                {/* **ROBUST CONDITIONAL RENDERING** */}
                {apiError && (
                    <div className="pt-6 mt-6 border-t">
                        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
                            <AlertTriangle className="h-6 w-6" />
                            <div>
                                <h3 className="font-semibold">Generation Failed</h3>
                                <p className="text-sm">{apiError}</p>
                            </div>
                        </div>
                    </div>
                )}

                {generatedData && !loading && (
                    <div className="pt-6 mt-6 border-t">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold uppercase">{getValues('subject')}</h2>
                            <Button onClick={handleExport} variant="secondary"><FileDown className="mr-2 h-4 w-4" /> Export as PDF</Button>
                        </div>
                        <div className="p-4 bg-yellow-50 border rounded-lg space-y-3 mb-4">
                            <Label className="font-semibold">Refine & Regenerate</Label>
                            <Textarea placeholder="e.g., Add more practical questions for weeks 5-6." value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} />
                            <Button onClick={() => handleGenerate(getValues(), true)} disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4" />}Regenerate</Button>
                        </div>
                        <Table className="border">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[10%]">Week</TableHead><TableHead className="w-[25%]">Focal Area (s)</TableHead><TableHead className="w-[15%]">Type of questions</TableHead>
                                    <TableHead className="text-center">1 (30%)</TableHead><TableHead className="text-center">2 (40%)</TableHead><TableHead className="text-center">3 (25%)</TableHead><TableHead className="text-center">4 (5%)</TableHead>
                                    <TableHead className="text-center font-bold">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generatedData.tosData.map((weekData, weekIndex) => (
                                    <React.Fragment key={`week-${weekIndex}`}>
                                        {weekData.questionDistribution.map((dist, distIndex) => {
                                            const rowTotal = (dist.dok1 || 0) + (dist.dok2 || 0) + (dist.dok3 || 0) + (dist.dok4 || 0);
                                            return (
                                                <TableRow key={`${weekIndex}-${distIndex}`}>
                                                    {distIndex === 0 && <TableCell rowSpan={weekData.questionDistribution.length} className="font-semibold align-top">{weekData.weekRange}</TableCell>}
                                                    {distIndex === 0 && <TableCell rowSpan={weekData.questionDistribution.length} className="align-top whitespace-pre-line">{weekData.focalAreas}</TableCell>}
                                                    <TableCell>{dist.type}</TableCell>
                                                    <TableCell className="text-center">{dist.dok1 || '-'}</TableCell>
                                                    <TableCell className="text-center">{dist.dok2 || '-'}</TableCell>
                                                    <TableCell className="text-center">{dist.dok3 || '-'}</TableCell>
                                                    <TableCell className="text-center">{dist.dok4 || '-'}</TableCell>
                                                    <TableCell className="text-center font-bold">{rowTotal}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                                {/* Total Row */}
                                <TableRow className="bg-gray-100 font-bold">
                                    <TableCell colSpan={3} className="text-right">TOTAL</TableCell>
                                    <TableCell className="text-center">{totals?.dok1}</TableCell>
                                    <TableCell className="text-center">{totals?.dok2}</TableCell>
                                    <TableCell className="text-center">{totals?.dok3}</TableCell>
                                    <TableCell className="text-center">{totals?.dok4}</TableCell>
                                    <TableCell className="text-center">{grandTotal}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}