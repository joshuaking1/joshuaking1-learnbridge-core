'use client';

import { useState, useCallback } from 'react';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { FileObject } from '@supabase/storage-js';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, File, MoreVertical, Trash2, Download, Loader2 } from 'lucide-react';

// This component receives the initial data and the user as props
export function ResourceVaultClient({ initialFiles, user }: { initialFiles: FileObject[], user: User }) {
    const supabase = createClientComponentClient();
    const [files, setFiles] = useState<FileObject[]>(initialFiles);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Re-fetch function to be called after mutations
    const fetchFiles = useCallback(async () => {
        const { data, error } = await supabase.storage
            .from('teacher-resources')
            .list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
        
        if (!error) {
            setFiles(data || []);
        } else {
            toast.error(`Failed to fetch files: ${error.message}`);
        }
    }, [supabase, user.id]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select a file.");
            return;
        }
        
        setUploading(true);
        const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;
        const { error } = await supabase.storage.from('teacher-resources').upload(filePath, selectedFile);
        
        if (error) {
            toast.error(`Upload failed: ${error.message}`);
        } else {
            toast.success("File uploaded successfully!");
            setSelectedFile(null);
            fetchFiles();
        }
        setUploading(false);
    };
    
    const handleDownload = async (fileName: string) => {
        const filePath = `${user.id}/${fileName}`;
        const { data, error } = await supabase.storage.from('teacher-resources').download(filePath);
        
        if (error) {
            toast.error(`Download failed: ${error.message || 'Please check permissions.'}`);
        } else {
            const blob = new Blob([data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };

    const handleDelete = async (fileName: string) => {
        const filePath = `${user.id}/${fileName}`;
        const { error } = await supabase.storage.from('teacher-resources').remove([filePath]);

        if (error) {
            toast.error(`Delete failed: ${error.message || 'Please check permissions.'}`);
        } else {
            toast.success("File deleted successfully!");
            // Optimistic UI update - immediately remove from state
            setFiles(currentFiles => currentFiles.filter(f => f.name !== fileName));
            // Then re-fetch to ensure consistency
            fetchFiles();
        }
    };
    
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Resource Vault</CardTitle>
                        <CardDescription>Manage your teaching materials.</CardDescription>
                    </div>
                    <Dialog onOpenChange={() => setSelectedFile(null)}>
                        <DialogTrigger asChild>
                            <Button disabled={!user}>
                                <UploadCloud className="mr-2 h-4 w-4" /> Upload File
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload a New Resource</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="resource-file">Choose a file</Label>
                                    <Input 
                                        id="resource-file" 
                                        type="file" 
                                        onChange={handleFileSelect} 
                                    />
                                </div>
                                {selectedFile && (
                                    <p className="text-sm text-gray-500">
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                                <DialogClose asChild>
                                    <Button 
                                        onClick={handleUpload} 
                                        disabled={uploading || !selectedFile} 
                                        className="w-full"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                                Uploading...
                                            </>
                                        ) : (
                                            "Confirm and Upload"
                                        )}
                                    </Button>
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>File Name</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Date Uploaded</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!user ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-red-500">
                                        Could not authenticate user.
                                    </TableCell>
                                </TableRow>
                            ) : files.length > 0 ? (
                                files.map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell>
                                            <File className="h-5 w-5 text-gray-500" />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {file.name}
                                        </TableCell>
                                        <TableCell>
                                            {formatBytes(file.metadata.size)}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(file.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => handleDownload(file.name)}>
                                                        <Download className="mr-2 h-4 w-4" /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        className="text-red-500" 
                                                        onClick={() => handleDelete(file.name)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        You haven&apos;t uploaded any resources yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
