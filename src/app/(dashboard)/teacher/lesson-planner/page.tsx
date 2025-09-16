// src/app/(dashboard)/teacher/lesson-planner/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { useDebouncedCallback } from 'use-debounce';
import { useTransformedDataStore } from '@/hooks/use-transformed-data-store';

// ... (all imports remain the same)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, FileDown, Loader2, Save, X, ClipboardEdit, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

// ... (Schemas, types, and helper components remain the same) ...
const lessonPlannerSchema = z.object({ subject: z.string().min(3, "Subject is required"), grade: z.string().min(1, "Form/Class is required"), week: z.number().min(1, "Week number is required"), duration: z.number().min(5, "Duration is required"), strand: z.string().min(3, "Strand is required"), subStrand: z.string().min(3, "Sub-Strand is required"), contentStandard: z.string().min(3, "Content Standard is required") });
type LessonPlanInputs = z.infer<typeof lessonPlannerSchema>;
const PlanRow = ({ label, children, isTall = false }: { label: string, children: React.ReactNode, isTall?: boolean }) => (<><div className={`py-4 px-6 font-semibold text-gray-700 bg-gray-50 ${isTall ? 'flex items-start pt-4' : 'flex items-center'}`}>{label}</div><div className={`py-4 px-6 col-span-3 ${isTall ? '' : 'flex items-center'}`}>{children}</div></>);
type SaveStatus = 'idle' | 'saving' | 'saved';

export default function LessonPlannerPage() {
    // ... (all state declarations remain the same: isGenerating, generatedPlan, isEditing, etc.)
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<unknown>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const planExportRef = useRef<HTMLDivElement>(null);

    const inputForm = useForm<LessonPlanInputs>({ resolver: zodResolver(lessonPlannerSchema) });
    const planForm = useForm<Record<string, unknown>>();
    const { watch, reset } = planForm;
    const { prefilledData, clearPrefilledData } = useTransformedDataStore();

    // ... (debouncedSave and watch useEffect remain the same) ...
    const debouncedSave = useDebouncedCallback(async (dataToSave) => { if (!activePlanId) return; setSaveStatus('saving'); try { await fetch('/api/lesson-plans', { method: 'PATCH', body: JSON.stringify({ planId: activePlanId, planData: dataToSave }), }); setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); } catch { toast.error("Auto-save failed."); setSaveStatus('idle'); } }, 2000);
    useEffect(() => { if (isEditing) { const subscription = watch((value) => { debouncedSave(value); }); return () => subscription.unsubscribe(); } }, [isEditing, watch, debouncedSave]);
    useEffect(() => { if (generatedPlan) { reset(generatedPlan); } }, [generatedPlan, reset]);

    // useEffect to check for and apply pre-filled data
    useEffect(() => {
        if (prefilledData) {
            // Use reset to populate the entire form with the data
            inputForm.reset({
                subject: prefilledData.subject || '',
                grade: prefilledData.grade || '',
                week: prefilledData.week || 1,
                duration: prefilledData.duration || 60,
                strand: prefilledData.strand || '',
                subStrand: prefilledData.subStrand || '',
                contentStandard: prefilledData.contentStandard || '',
            });
            toast.info("Form has been pre-filled from your chat session.");
            clearPrefilledData(); // Clear the data so it's not used again on refresh
        }
    }, [prefilledData, clearPrefilledData, inputForm]);

     const handleGeneratePlan = async (data: LessonPlanInputs) => {
        setIsGenerating(true); setGeneratedPlan(null); setIsEditing(false); setActivePlanId(null);
        
        const promise = fetch('/api/lesson-planner', { method: 'POST', body: JSON.stringify(data) })
            .then(res => res.json())
            .then(async (planData) => {
                // The lesson-planner API returns the plan data directly
                if (!planData) throw new Error("Invalid response from server.");
                
                // Now save the plan to get an ID
                const saveResponse = await fetch('/api/lesson-plans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(planData),
                });
                const { id } = await saveResponse.json();
                
                setActivePlanId(id); // **STORE THE ID**
                setGeneratedPlan(planData); // **STORE THE PLAN DATA**
                return planData;
        });

        toast.loading('AI crafting plan & performing initial save...');
        
        promise
            .then(() => {
                toast.success('Plan generated and saved successfully!');
            })
            .catch((err) => {
                toast.error(`Generation failed: ${err.message}`);
            })
            .finally(() => setIsGenerating(false));
    };

    const handleSaveChanges = (data: Record<string, unknown>) => {
        debouncedSave.flush(); // Immediately save any pending changes
        setGeneratedPlan(data);
        setIsEditing(false);
        toast.success("Changes saved successfully!");
    };
    
    // *** MODIFIED EXPORT FUNCTION ***
    const handleExport = () => {
        const input = planExportRef.current;
        if (!input || !activePlanId) {
             toast.error("Cannot export without a saved plan.");
             return;
        }

        toast.info("Preparing your PDF...");
        
        // Add PDF export class to override problematic CSS
        input.classList.add('pdf-export');
        
        html2canvas(input, { 
            scale: 2, 
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => {
                // Ignore elements with unsupported CSS
                return element.classList.contains('ignore-pdf');
            }
        }).then(async (canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Add the lesson plan image to the first page
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            // *** NEW: Create a second page for verification ***
            pdf.addPage();
            
            const verificationUrl = `https://beta.learnbridgedu.com/verify/lesson?id=${activePlanId}`;
            try {
                // Generate QR code
                const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { 
                    width: 200, // High resolution for better quality
                    margin: 2 
                });
                
                // Center the QR code on the second page
                const qrCodeSize = 80; // Large QR code for easy scanning
                const centerX = (pdfWidth - qrCodeSize) / 2;
                const centerY = (pdfHeight - qrCodeSize) / 2 - 20;
                
                // Add QR code in the center
                pdf.addImage(qrCodeDataUrl, 'PNG', centerX, centerY, qrCodeSize, qrCodeSize);
                
                // Add title above QR code
                pdf.setFontSize(16);
                pdf.setTextColor(2, 46, 125); // Brand secondary color
                pdf.setFont('helvetica', 'bold');
                pdf.text('Document Verification', pdfWidth / 2, centerY - 30, { align: 'center' });
                
                // Add verification text below QR code
                pdf.setFontSize(12);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                pdf.text('Generated by LearnBridgeEdu.com', pdfWidth / 2, centerY + qrCodeSize + 20, { align: 'center' });
                
                // Add verification URL
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text('Scan QR code or visit:', pdfWidth / 2, centerY + qrCodeSize + 35, { align: 'center' });
                pdf.text(verificationUrl, pdfWidth / 2, centerY + qrCodeSize + 45, { align: 'center' });
                
                // Add a decorative border
                pdf.setDrawColor(253, 106, 62); // Brand primary color
                pdf.setLineWidth(2);
                pdf.rect(20, centerY - 50, pdfWidth - 40, qrCodeSize + 100);
                
                // Add LearnBridgeEdu branding at the bottom
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('LearnBridgeEdu - AI-Powered Education Platform', pdfWidth / 2, pdfHeight - 20, { align: 'center' });
                
            } catch (err) {
                console.error('Failed to generate QR code', err);
            }
            
            pdf.save(`LearnBridgeEdu - ${generatedPlan.userInput.subject} - Week ${generatedPlan.userInput.week}.pdf`);
            toast.success("PDF exported successfully!");
            
            // Clean up: remove PDF export class
            input.classList.remove('pdf-export');
        }).catch((error) => {
            console.error('PDF export error:', error);
            toast.error("Failed to export PDF. Please try again.");
            
            // Clean up: remove PDF export class even on error
            if (input) {
                input.classList.remove('pdf-export');
        }
        });
    };
    
    return (
        // ... (The entire JSX structure remains EXACTLY the same as before)
        // No visual changes are needed, only the logic in the handlers has been updated.
        <div className="flex flex-col gap-6">
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 /> AI Lesson Plan Generator</CardTitle>
                    <CardDescription>Enter the core curriculum details to generate a comprehensive, SBC-aligned plan.</CardDescription>
                    </CardHeader>
                <CardContent>
                    <form onSubmit={inputForm.handleSubmit(handleGeneratePlan)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1"><Label htmlFor="subject">Subject</Label><Input id="subject" {...inputForm.register("subject")} />{inputForm.formState.errors.subject && <p className="text-red-500 text-xs">{inputForm.formState.errors.subject.message}</p>}</div>
                            <div className="space-y-1"><Label htmlFor="grade">Form / Class</Label><Input id="grade" {...inputForm.register("grade")} />{inputForm.formState.errors.grade && <p className="text-red-500 text-xs">{inputForm.formState.errors.grade.message}</p>}</div>
                            <div className="space-y-1"><Label htmlFor="week">Week</Label><Input id="week" type="number" {...inputForm.register("week", { valueAsNumber: true })} />{inputForm.formState.errors.week && <p className="text-red-500 text-xs">{inputForm.formState.errors.week.message}</p>}</div>
                            <div className="space-y-1"><Label htmlFor="duration">Duration (mins)</Label><Input id="duration" type="number" {...inputForm.register("duration", { valueAsNumber: true })} />{inputForm.formState.errors.duration && <p className="text-red-500 text-xs">{inputForm.formState.errors.duration.message}</p>}</div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-1"><Label htmlFor="strand">Strand</Label><Input id="strand" {...inputForm.register("strand")} />{inputForm.formState.errors.strand && <p className="text-red-500 text-xs">{inputForm.formState.errors.strand.message}</p>}</div>
                             <div className="space-y-1"><Label htmlFor="subStrand">Sub-Strand</Label><Input id="subStrand" {...inputForm.register("subStrand")} />{inputForm.formState.errors.subStrand && <p className="text-red-500 text-xs">{inputForm.formState.errors.subStrand.message}</p>}</div>
                             <div className="space-y-1"><Label htmlFor="contentStandard">Content Standard</Label><Input id="contentStandard" {...inputForm.register("contentStandard")} />{inputForm.formState.errors.contentStandard && <p className="text-red-500 text-xs">{inputForm.formState.errors.contentStandard.message}</p>}</div>
                        </div>
                        <div className="flex justify-end pt-2">
                             <Button type="submit" size="lg" disabled={isGenerating}>{isGenerating ? <Loader2 className="animate-spin" /> : 'Generate Plan'}</Button>
                        </div>
                    </form>
                    </CardContent>
                </Card>
             <Card className="flex-1">
                     <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Generated Learning Plan</CardTitle>
                        <CardDescription>Review and export your AI-generated plan.</CardDescription>
                        {/* --- VISUAL SAVE STATUS INDICATOR --- */}
                        {isEditing && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                {saveStatus === 'saving' && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /><span>Saving...</span></>}
                                {saveStatus === 'saved' && <><CheckCircle className="h-4 w-4 mr-2 text-green-500" /><span>Saved</span></>}
                                {saveStatus === 'idle' && <span>Changes will be saved automatically.</span>}
                            </div>
                        )}
                    </div>
                         <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => { setIsEditing(false); reset(generatedPlan); }}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                                <Button onClick={planForm.handleSubmit(handleSaveChanges)}><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(true)} disabled={!generatedPlan || isGenerating}><ClipboardEdit className="mr-2 h-4 w-4" /> Edit</Button>
                                <Button onClick={handleExport} disabled={!generatedPlan || isGenerating}><FileDown className="mr-2 h-4 w-4" /> Export as PDF</Button>
                            </>
                        )}
                        </div>
                    </CardHeader>
                    <CardContent>
                    <ScrollArea className="h-[calc(100vh-28rem)] w-full">
                        {isGenerating && (<div className="flex flex-col items-center justify-center h-full text-center p-8"><Loader2 className="h-12 w-12 text-brand-primary animate-spin mb-4" /><h3 className="text-xl font-semibold">Generating your lesson...</h3></div>)}
                        {generatedPlan && (
                            <div ref={planExportRef}>
                                <div className="border rounded-lg p-4">
                                    <div className="text-center py-6">
                                        <h2 className="text-2xl font-bold text-brand-secondary">Learning Plan</h2>
                                        <p className="text-sm text-gray-600">{generatedPlan.userInput.subject} - Week {generatedPlan.userInput.week}</p>
                                    </div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Subject">{isEditing ? <Input {...planForm.register("subject")} /> : generatedPlan.subject}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b">
                                        <PlanRow label="Strand">{isEditing ? <Input {...planForm.register("strand")} /> : generatedPlan.strand}</PlanRow>
                                        <div className="py-4 px-6 font-semibold text-gray-700 bg-gray-50 flex items-center border-l">Sub-Strand</div>
                                        <div className="py-4 px-6 col-span-1 flex items-center">{isEditing ? <Input {...planForm.register("subStrand")} /> : generatedPlan.subStrand}</div>
                                    </div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Content Standard">{isEditing ? <Input {...planForm.register("contentStandard")} /> : generatedPlan.contentStandard}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Learning Outcome(s)" isTall>{isEditing ? <Textarea className="min-h-[100px]" {...planForm.register("learningOutcomes")} /> : <p className="whitespace-pre-wrap">{generatedPlan.learningOutcomes}</p>}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Learning Indicator(s)" isTall>{isEditing ? <Textarea className="min-h-[100px]" {...planForm.register("learningIndicators")} /> : <p className="whitespace-pre-wrap">{generatedPlan.learningIndicators}</p>}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Essential Question(s)" isTall>{isEditing ? <Textarea className="min-h-[100px]" {...planForm.register("essentialQuestions")} /> : <p className="whitespace-pre-wrap">{generatedPlan.essentialQuestions}</p>}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Pedagogical Strategies">{isEditing ? <Input {...planForm.register("pedagogicalStrategies")} /> : generatedPlan.pedagogicalStrategies}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Teaching & Learning Resources" isTall>{isEditing ? <Textarea className="min-h-[100px]" {...planForm.register("teachingLearningResources")} /> : <p className="whitespace-pre-wrap">{generatedPlan.teachingLearningResources}</p>}</PlanRow></div>
                                    <div className="grid grid-cols-4 border-b"><PlanRow label="Key Notes on Differentiation" isTall>{isEditing ? <Textarea className="min-h-[100px]" {...planForm.register("keyNotesOnDifferentiation")} /> : <p className="whitespace-pre-wrap">{generatedPlan.keyNotesOnDifferentiation}</p>}</PlanRow></div>
                                    
                                    <div className="grid grid-cols-7 text-sm font-bold text-center bg-gray-100 border-b mt-4">
                                        <div className="py-3 px-2">Phase</div><div className="py-3 px-2 col-span-3 border-l">Teacher Activity</div><div className="py-3 px-2 col-span-3 border-l">Learner Activity</div>
                                 </div>
                                    {planForm.watch('activities')?.map((act: { phase: string; teacherActivity: string; learnerActivity: string }, index: number) => (
                                        <div key={index} className="grid grid-cols-7 text-sm border-b last:border-b-0">
                                            <div className="py-4 px-6 font-semibold text-orange-600 bg-orange-50 flex items-start">{isEditing ? <Input {...planForm.register(`activities.${index}.phase`)} /> : act.phase}</div>
                                            <div className="py-4 px-6 col-span-3">{isEditing ? <Textarea className="min-h-[120px]" {...planForm.register(`activities.${index}.teacherActivity`)} /> : <p className="whitespace-pre-wrap">{act.teacherActivity}</p>}</div>
                                            <div className="py-4 px-6 col-span-3 border-l">{isEditing ? <Textarea className="min-h-[120px]" {...planForm.register(`activities.${index}.learnerActivity`)} /> : <p className="whitespace-pre-wrap">{act.learnerActivity}</p>}</div>
                                </div>
                                    ))}
                                    </div>
                            </div>
                            )}
                        {!generatedPlan && !isGenerating && (<div className="flex flex-col items-center justify-center h-full text-center border rounded-lg bg-gray-50/50"><Wand2 className="h-16 w-16 text-gray-300 mb-4" /><h3 className="text-xl font-semibold">Your professional learning plan will appear here.</h3><p className="text-gray-500">Fill in the form above to begin.</p></div>)}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
    );
}