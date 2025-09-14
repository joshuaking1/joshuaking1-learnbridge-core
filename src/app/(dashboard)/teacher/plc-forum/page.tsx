// src/app/(dashboard)/teacher/plc-forum/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Type now matches the output of our SQL function
type ForumPost = {
    id: string;
    title: string;
    created_at: string;
    author_name: string;
    reply_count: number;
};

export default function PLCForumPage() {
    const supabase = createClientComponentClient();
    const [user, setUser] = useState<User | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const { register, handleSubmit, reset } = useForm();
    
    // *** NEW: State to control the dialog's open status ***
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // **CORRECTED fetchPosts function**
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        // Call the remote procedure
        const { data, error } = await supabase
            .rpc('get_forum_posts_with_details');

        if (error) {
            toast.error("Failed to load discussions: " + error.message);
        } else {
            setPosts(data || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
        fetchPosts();
    }, [supabase, fetchPosts]);
    
    // *** MODIFIED: handleCreatePost now closes the dialog on success ***
    const handleCreatePost = async (formData: any) => {
        if (!user) { toast.error("You must be logged in to post."); return; }

        // Show a loading toast immediately for better UX
        toast.promise(
            (async () => {
                const { error } = await supabase
                    .from('forum_posts')
                    .insert({
                        author_id: user.id,
                        title: formData.title,
                        content: formData.content
                    });
                if (error) throw error;
                return { success: true };
            })(),
            {
                loading: 'Posting your discussion...',
                success: () => {
                    reset(); // Clear the form
                    fetchPosts(); // Refresh the list
                    setIsDialogOpen(false); // **CLOSE DIALOG ON SUCCESS**
                    return "Discussion started successfully!";
                },
                error: (err) => `Failed to create post: ${err.message}`,
            }
        );
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-3xl font-bold">PLC Forum</h1><p className="text-gray-500">Collaborate with fellow educators.</p></div>
                {/* *** MODIFIED: Dialog component now controlled by state *** */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" disabled={!user}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Start New Discussion
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Start a New Discussion</DialogTitle></DialogHeader>
                        <form onSubmit={handleSubmit(handleCreatePost)} className="space-y-4 pt-4">
                            <div className="space-y-2"><Label>Title</Label><Input placeholder="A clear, concise title for your topic..." {...register("title", { required: true })} /></div>
                            <div className="space-y-2"><Label>Content</Label><Textarea placeholder="Share your thoughts, ask a question..." rows={6} {...register("content")} /></div>
                            {/* *** The Button is no longer wrapped in DialogClose *** */}
                            <Button type="submit" className="w-full">Post Discussion</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="p-0">
                    {loading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                    <ul className="divide-y">
                        {posts.map(post => (
                            <li key={post.id}>
                                <Link href={`/teacher/plc-forum/${post.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                                    <Avatar className="hidden sm:flex">
                                        {/* Use the new author_name field */}
                                        <AvatarFallback>{post.author_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-semibold">{post.title}</p>
                                        <p className="text-sm text-gray-500">
                                            Posted by {post.author_name || 'A user'} • {new Date(post.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MessageSquare className="h-5 w-5" />
                                        {/* Use the new reply_count field */}
                                        <span>{post.reply_count}</span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>}
                </CardContent>
            </Card>
        </div>
    );
}