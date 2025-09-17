// src/components/admin/curriculum-client.tsx
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, MoreVertical, Trash2, Cpu, BrainCircuit, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function CurriculumClient({ initialDocuments }: { initialDocuments: any[] }) {
    const [documents, setDocuments] = useState(initialDocuments);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [subjectTag, setSubjectTag] = useState('');
    const [uploading, setUploading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    const handleUpload = async () => {
        if (!selectedFile || !subjectTag) {
            toast.error("Please select a file and provide a subject tag.");
            return;
        }
        setUploading(true);

        // **THE FINAL FIX: Create FormData and send to our own API**
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subjectTag', subjectTag);

        const promise = fetch('/api/admin/upload', {
            method: 'POST',
            body: formData, // No 'Content-Type' header needed, browser sets it for FormData
        }).then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
            return res.json();
        });

        toast.promise(promise, {
            loading: 'Uploading and saving record securely...',
            success: (newDoc) => {
                setDocuments([newDoc, ...documents]);
                return "Document processed successfully!";
            },
            error: (err) => `Failed: ${err.message}`,
            finally: () => setUploading(false)
        });
    };

    // *** NEW: Function to trigger the vectorization pipeline ***
    const handleProcessDocument = async (doc: any) => {
        setProcessingId(doc.id);
        
        const promise = supabase.functions.invoke('vectorize-document', {
            body: { documentId: doc.id, storagePath: doc.storage_path }
        }).then(res => {
            if (res.error) throw new Error(res.error.message);
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        });

        toast.promise(promise, {
            loading: `Starting vectorization for "${doc.file_name}"...`,
            success: (data) => {
                // Here you would re-fetch the document list to update the status
                return data.message;
            },
            error: (err) => err.message,
            finally: () => setProcessingId(null)
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Curriculum Knowledge Base</CardTitle>
                        <CardDescription>Manage the source-of-truth documents that power the platform's AI.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild><Button><UploadCloud className="mr-2"/> Upload Document</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Upload New Curriculum</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Subject Tag</Label><Input placeholder="e.g., JHS 1 Integrated Science" value={subjectTag} onChange={e => setSubjectTag(e.target.value)} /></div>
                                <div className="space-y-2"><Label>Document (PDF, DOCX)</Label><Input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></div>
                                <Button onClick={handleUpload} disabled={uploading} className="w-full">{uploading ? "Uploading..." : "Upload and Begin Processing"}</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>File Name</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Uploaded</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {documents.map(doc => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">{doc.file_name}</TableCell>
                                    <TableCell>{doc.subject_tag}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            doc.processing_status === 'completed' ? 'default' : 
                                            doc.processing_status === 'processing' ? 'secondary' : 'destructive'
                                        } className={doc.processing_status === 'completed' ? 'bg-green-500' : ''}>
                                            {doc.processing_status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" title="Generate Q&A Dataset (Coming Soon)" disabled><BrainCircuit className="h-4 w-4" /></Button>
                                        {/* ** THE FIX: Activate the Process button ** */}
                                        <Button
                                            variant="ghost" size="icon"
                                            title="Process and Vectorize Document"
                                            onClick={() => handleProcessDocument(doc)}
                                            disabled={processingId === doc.id || doc.processing_status === 'completed'}
                                        >
                                            {processingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" title="Delete" disabled><Trash2 className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}