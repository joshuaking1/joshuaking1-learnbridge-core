// src/components/assessments/assessment-generator.tsx
'use client';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Wand2, Loader2, PlusCircle, Trash2, FileDown, RefreshCw } from "lucide-react";
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';
import { useTransformedDataStore } from '@/hooks/use-transformed-data-store';

const assessmentTypes = [{ id: 'mcq', label: 'Multiple Choice' }, { id: 'short-answer', label: 'Short Answer' }, { id: 'essay', label: 'Essay Prompt' }];

export function AssessmentGenerator() {
    const [loading, setLoading] = useState(false);
    const [generatedData, setGeneratedData] = useState<{ assessmentId: string, assessmentItems: any[] } | null>(null);
    const [refinementPrompt, setRefinementPrompt] = useState('');

    const { register, control, handleSubmit, getValues, reset } = useForm({
        defaultValues: { topic: "Photosynthesis", grade: "JHS 1", dokRequests: [{ dok: "1", type: "mcq", count: 2 }] }
    });
    const { fields, append, remove } = useFieldArray({ control, name: "dokRequests" });
    const { prefilledData, clearPrefilledData } = useTransformedDataStore();

    // useEffect to check for and apply pre-filled data
    useEffect(() => {
        if (prefilledData) {
            reset({
                topic: prefilledData.topic || '',
                grade: prefilledData.grade || '',
                dokRequests: prefilledData.requests || [{ dok: "1", type: "mcq", count: 5 }]
            });
            toast.info("Form has been pre-filled from your chat session.");
            clearPrefilledData(); // Clear the data
        }
    }, [prefilledData, clearPrefilledData, reset]);
    
    const handleGenerate = async (data: any, isRefinement = false) => {
        setLoading(true);
        if (!isRefinement) { setGeneratedData(null); }

        const promise = fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                generationType: 'assessment',
                topic: data.topic,
                grade: data.grade,
                requests: data.dokRequests,
                refinement_prompt: isRefinement ? refinementPrompt : ''
            }),
        }).then(res => res.json());

        toast.promise(promise, {
            loading: isRefinement ? 'Regenerating with your feedback...' : 'Generating new assessment...',
            success: (result) => { 
                // Validate the response structure
                if (result && result.assessmentItems && Array.isArray(result.assessmentItems)) {
                    setGeneratedData(result); 
                    return 'Assessment generated successfully!';
                } else {
                    console.error('Invalid API response:', result);
                    throw new Error('Invalid response format from API');
                }
            },
            error: 'Failed to generate assessment.',
            finally: () => setLoading(false),
        });
    };

    const handleExport = async () => {
        if (!generatedData || !generatedData.assessmentItems || !Array.isArray(generatedData.assessmentItems)) {
            toast.error('No valid assessment data to export');
            return;
        }
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        // Header
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Assessment Paper', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Topic: ${getValues('topic')}`, 15, 30);
        doc.text(`Class: ${getValues('grade')}`, 15, 38);
        
        // Body - add questions manually
        let yPosition = 50;
        generatedData.assessmentItems.forEach((item, index) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Q${index + 1} (DoK ${item.dok}):`, 15, yPosition);
            
            doc.setFont('helvetica', 'normal');
            const questionText = item.question || item.prompt || '';
            const lines = doc.splitTextToSize(questionText, 180);
            doc.text(lines, 15, yPosition + 5);
            yPosition += 5 + (lines.length * 5);
            
            if (item.options) {
                item.options.forEach((opt: string, optIndex: number) => {
                    doc.text(`${String.fromCharCode(65 + optIndex)}) ${opt}`, 20, yPosition);
                    yPosition += 5;
                });
            }
            yPosition += 10;
        });
        
        // Footer & QR Code
        const verificationUrl = `https://www.learnbridgeedu.com/verify?id=${generatedData.assessmentId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl);
        doc.addImage(qrCodeDataUrl, 'PNG', 15, 270, 25, 25);
        doc.setFontSize(8);
        doc.text("Generated by LearnBridgeEdu.com", 45, 278);
        doc.text(`Verify authenticity: ${verificationUrl}`, 45, 282);
        
        doc.save(`${getValues('topic')} Assessment.pdf`);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dynamic Assessment Generator</CardTitle>
                <CardDescription>Design, refine, and export custom assessments.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(data => handleGenerate(data, false))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2"><Label>Subject / Topic</Label><Input {...register("topic")} /></div>
                       <div className="space-y-2"><Label>Form / Class</Label><Input {...register("grade")} /></div>
                    </div>
                    <div className="space-y-4">
                        <Label className="font-semibold">Question Distribution</Label>
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-3 bg-gray-50 rounded-md border">
                                <div className="flex-1 space-y-1"><Label className="text-xs">DoK Level</Label><Controller name={`dokRequests.${index}.dok`} control={control} render={({ field }) => (<Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem></SelectContent></Select>)}/></div>
                                <div className="flex-1 space-y-1"><Label className="text-xs">Question Type</Label><Controller name={`dokRequests.${index}.type`} control={control} render={({ field }) => (<Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{assessmentTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>)}/></div>
                                <div className="w-24 space-y-1"><Label className="text-xs">Count</Label><Input type="number" {...register(`dokRequests.${index}.count`)} /></div>
                                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                         <Button type="button" variant="outline" onClick={() => append({ dok: "1", type: "mcq", count: 2 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Level</Button>
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                         <Button size="lg" type="submit" disabled={loading}><Wand2 className="mr-2 h-4 w-4" /> Generate New Assessment</Button>
                    </div>
                </form>

                {generatedData && (
                    <div className="pt-6 mt-6 border-t space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold">Generated Assessment</h3>
                            <Button onClick={handleExport} variant="secondary"><FileDown className="mr-2 h-4 w-4" /> Export as PDF</Button>
                        </div>
                         {/* --- REFINE SECTION --- */}
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3">
                            <Label htmlFor="refine" className="font-semibold">Refine & Regenerate</Label>
                            <Textarea id="refine" placeholder="e.g., Make the questions harder. Add a question about the Big Six." value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} />
                            <Button onClick={() => handleGenerate(getValues(), true)} disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Regenerate with Feedback
                            </Button>
                        </div>

                        {/* --- RENDERED ITEMS --- */}
                         <div className="space-y-4">
                            {generatedData.assessmentItems && Array.isArray(generatedData.assessmentItems) ? generatedData.assessmentItems.map((item, index) => (
                                <div key={index} className="p-4 border rounded-md">
                                    <div className="flex justify-between items-center text-xs text-gray-500 mb-2"><span>Type: {item.type.toUpperCase()}</span><span>DoK: {item.dok}</span></div>
                                    {item.question && <p><strong>Q{index + 1}:</strong> {item.question}</p>}
                                    {item.prompt && <p><strong>Prompt:</strong> {item.prompt}</p>}
                                    {item.options && <ul className="list-disc pl-5 mt-2">{item.options.map((opt: string, i: number) => <li key={i}>{opt}</li>)}</ul>}
                                    <details className="mt-2 text-sm"><summary className="cursor-pointer text-green-700 font-semibold">Show Answer</summary><div className="p-2 bg-green-50 rounded-md mt-1">{item.answer || item.suggestedAnswer || item.keyPoints}</div></details>
                                </div>
                            )) : (
                                <div className="p-4 text-center text-gray-500">
                                    No assessment items available. Please try generating again.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}