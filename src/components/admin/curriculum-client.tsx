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
import { Progress } from '@/components/ui/progress';

export function CurriculumClient({ initialDocuments }: { initialDocuments: any[] }) {
    const [documents, setDocuments] = useState(initialDocuments);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [subjectTag, setSubjectTag] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const supabase = createClientComponentClient();

    const handleUpload = async () => {
        if (!selectedFile || !subjectTag) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('subjectTag', subjectTag);

        const promise = fetch('/api/admin/upload', {
            method: 'POST',
            body: formData,
        }).then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.error) });
            return res.json();
        });

        toast.promise(promise, {
            loading: 'Securely uploading via admin channel...',
            success: (newDoc) => {
                setDocuments([newDoc, ...documents]);
                setSelectedFile(null);
                setSubjectTag('');
                setUploading(false);
                return "Document processed successfully!";
            },
            error: (err) => `Failed: ${err.message}`,
            finally: () => setUploading(false)
        });
    };

    // **THE MISSING FUNCTION**
    const handleProcessDocument = async (doc: any) => {
        setProcessingId(doc.id);
        const promise = supabase.functions.invoke('vectorize-document', {
            body: { documentId: doc.id, storagePath: doc.storage_path }
        });
        toast.promise(promise, {
            loading: `Vectorizing "${doc.file_name}"...`,
            success: (data: any) => {
                if (data.error) throw new Error(data.error);
                // Manually update the status in the UI for instant feedback
                setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, processing_status: 'completed' } : d));
                return data.data.message;
            },
            error: (err) => err.message,
            finally: () => setProcessingId(null)
        });
    };

    const handleDelete = async (documentId: string) => {
        const promise = fetch('/api/admin/curriculum', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ documentId })
        }).then(async res => {
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error);
            }
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        });

        toast.promise(promise, {
            loading: 'Deleting document...',
            success: 'Document deleted successfully!',
            error: 'Failed to delete document'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="default" className="bg-green-500">Completed</Badge>;
            case 'processing':
                return <Badge variant="secondary" className="bg-yellow-500">Processing</Badge>;
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">Pending</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    Curriculum Documents
                </CardTitle>
                <CardDescription>
                    Upload and manage curriculum documents for AI-powered search and analysis
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full mb-6">
                            <UploadCloud className="h-4 w-4 mr-2" />
                            Upload New Document
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload New Curriculum</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select PDF File</Label>
                                <Input
                                    id="file"
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject Tag</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g., Mathematics, Science, History"
                                    value={subjectTag}
                                    onChange={(e) => setSubjectTag(e.target.value)}
                                />
                            </div>
                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Upload Progress</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="w-full" />
                                </div>
                            )}
                            <Button 
                                onClick={handleUpload} 
                                disabled={uploading || !selectedFile || !subjectTag} 
                                className="w-full"
                            >
                                {uploading ? `Uploading... ${uploadProgress}%` : "Upload Document"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>File Name</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Uploaded</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map(doc => (
                            <TableRow key={doc.id}>
                                <TableCell className="font-medium">{doc.file_name}</TableCell>
                                <TableCell>{doc.subject_tag}</TableCell>
                                <TableCell>{getStatusBadge(doc.processing_status)}</TableCell>
                                {/* **THE FIX for Invalid Date** */}
                                <TableCell>{new Date(doc.uploaded_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    {/* **THE FIX: The Process button is back** */}
                                    <Button
                                        variant="ghost" 
                                        size="icon"
                                        title="Process and Vectorize Document"
                                        onClick={() => handleProcessDocument(doc)}
                                        disabled={processingId === doc.id || doc.processing_status !== 'pending'}
                                    >
                                        {processingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title="Delete"
                                        onClick={() => handleDelete(doc.id)}
                                        disabled={doc.processing_status === 'processing'}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}