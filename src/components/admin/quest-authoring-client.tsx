// src/components/admin/quest-authoring-client.tsx
'use client';
import { useState, useEffect } from 'react';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Loader2, BookText, FileText, GripVertical, Trash2 } from 'lucide-react';

type ContentItem = { id: string; subject: string; grade: string; week?: number; topic?: string };

export function QuestAuthoringClient({ initialQuestLines }: { initialQuestLines: any[] }) {
    const supabase = createClientComponentClient();
    const [questLines, setQuestLines] = useState(initialQuestLines);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [availableContent, setAvailableContent] = useState<{ lessons: ContentItem[], assessments: ContentItem[] }>({ lessons: [], assessments: [] });

    const { register, control, handleSubmit, reset, watch } = useForm({
        defaultValues: {
            title: "",
            description: "",
            target_grade: "",
            subject: "",
            items: [] as { type: 'lesson' | 'assessment'; content: ContentItem | null }[]
        }
    });

    const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
    const watchItems = watch("items");

    // Fetch available lessons and assessments when the dialog opens
    useEffect(() => {
        if (isDialogOpen) {
            const fetchContent = async () => {
                const { data: lessons } = await supabase.from('lesson_plans').select('id, subject, grade, week');
                const { data: assessments } = await supabase.from('assessments').select('id, topic, grade');
                setAvailableContent({ lessons: lessons as any, assessments: assessments as any });
            };
            fetchContent();
        }
    }, [isDialogOpen, supabase]);

    const onSubmit = async (data: any) => {
        // This would be a call to a secure RPC function to create the questline and its items in a single transaction
        console.log("Submitting Quest Line:", data);
        toast.success("Quest Line created successfully!");
        // Here you would re-fetch the questLines list
        reset();
        setStep(1);
        setIsDialogOpen(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-bold">Quest Authoring</h1><p className="text-gray-500">Create and manage the main learning pathways for students.</p></div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button size="lg"><PlusCircle className="mr-2"/> Create New Quest Line</Button></DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Quest Line Creation Wizard</DialogTitle>
                            <DialogDescription>Follow the steps to build a new learning pathway.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            {step === 1 && (
                                <div className="space-y-4 py-4">
                                    <h3 className="font-semibold">Step 1: Basic Details</h3>
                                    <div><Label>Title</Label><Input placeholder="JHS 1 Integrated Science - Term 1" {...register("title")} /></div>
                                    <div><Label>Description</Label><Textarea placeholder="A quest line covering the fundamentals of science for JHS 1." {...register("description")} /></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><Label>Target Grade</Label><Input placeholder="JHS 1" {...register("target_grade")} /></div>
                                        <div><Label>Subject</Label><Input placeholder="Integrated Science" {...register("subject")} /></div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 py-4">
                                    <h3 className="font-semibold">Step 2: Add and Order Quests</h3>
                                    <div className="p-4 border rounded-md min-h-[200px] space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                                <GripVertical className="cursor-move text-gray-400" />
                                                <div className={`p-2 rounded ${watchItems[index].type === 'lesson' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                                    {watchItems[index].type === 'lesson' ? <BookText className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{watchItems[index].content?.subject || watchItems[index].content?.topic}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {watchItems[index].type === 'lesson' ? `Lesson Plan - Week ${watchItems[index].content?.week}` : 'Assessment'}
                                                    </p>
                                                </div>
                                                <Button variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild><Button variant="outline">Add Lesson</Button></PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search lessons..." /><CommandList><CommandEmpty>No results.</CommandEmpty><CommandGroup>
                                                {availableContent.lessons.map(lesson => (
                                                    <CommandItem key={lesson.id} onSelect={() => append({ type: 'lesson', content: lesson })}>
                                                        {lesson.subject} - Week {lesson.week}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup></CommandList></Command></PopoverContent>
                                        </Popover>
                                         <Popover>
                                            <PopoverTrigger asChild><Button variant="outline">Add Assessment</Button></PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search assessments..." /><CommandList><CommandEmpty>No results.</CommandEmpty><CommandGroup>
                                                 {availableContent.assessments.map(ass => (
                                                    <CommandItem key={ass.id} onSelect={() => append({ type: 'assessment', content: ass })}>
                                                        {ass.topic} - {ass.grade}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup></CommandList></Command></PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            )}
                            
                            <DialogFooter>
                                {step > 1 && <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
                                {step < 2 && <Button type="button" onClick={() => setStep(step + 1)}>Next</Button>}
                                {step === 2 && <Button type="submit">Create Quest Line</Button>}
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader><CardTitle>Existing Quest Lines</CardTitle></CardHeader>
                <CardContent>
                   <Table>
                       <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Grade</TableHead><TableHead># of Quests</TableHead></TableRow></TableHeader>
                       <TableBody>
                           {questLines.map(ql => (
                               <TableRow key={ql.id}>
                                   <TableCell className="font-semibold">{ql.title}</TableCell>
                                   <TableCell>{ql.subject}</TableCell>
                                   <TableCell>{ql.target_grade}</TableCell>
                                   <TableCell>{ql.quest_line_items[0]?.count || 0}</TableCell>
                               </TableRow>
                           ))}
                       </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
    );
}