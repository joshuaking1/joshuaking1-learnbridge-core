// src/app/(dashboard)/teacher/plc-forum/[postId]/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Types now match the RPC return values
type Post = { id: string; title: string; content: string; created_at: string; author_name: string };
type Reply = { id: string; content: string; created_at: string; author_name: string };

export default function PostPage() {
    const supabase = createClientComponentClient();
    const params = useParams();
    const postId = params.postId as string;
    const [user, setUser] = useState<User | null>(null);
    const [post, setPost] = useState<Post | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [newReply, setNewReply] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchPostAndReplies = useCallback(async () => {
        setLoading(true);

        // **CORRECTED RPC CALL for the main post**
        // We now pass the parameter as an object with the function's parameter name.
        const { data: postData, error: postError } = await supabase
            .rpc('get_single_post', { p_id: postId });
        
        // **CORRECTED RPC CALL for the replies**
        const { data: repliesData, error: repliesError } = await supabase
            .rpc('get_post_replies', { p_id: postId });

        if (postError || repliesError) {
            toast.error("Failed to load discussion.", {
                description: postError?.message || repliesError?.message
            });
            setPost(null);
        } else {
            setPost(postData?.[0] || null); 
            setReplies(repliesData || []);
        }
        setLoading(false);
    }, [supabase, postId]);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
        fetchPostAndReplies();
    }, [supabase, fetchPostAndReplies]);

    const handleAddReply = async () => {
        if (!user || !newReply.trim()) return;
        const { error } = await supabase.from('forum_replies').insert({
            author_id: user.id,
            post_id: postId,
            content: newReply
        });

        if (error) {
            toast.error("Failed to post reply: " + error.message);
        } else {
            setNewReply('');
            toast.success("Reply posted!");
            fetchPostAndReplies(); // Refresh replies
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    if (!post) return (
        <div className="text-center p-12">
            <h2 className="text-xl font-semibold">Post not found.</h2>
            <p className="text-gray-500">It may have been deleted or the link is incorrect.</p>
            <Button asChild className="mt-4"><Link href="/teacher/plc-forum">Back to Forum</Link></Button>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <Link href="/teacher/plc-forum" className="flex items-center gap-2 text-sm text-gray-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to all discussions</Link>
            
            {/* Original Post */}
            <Card>
                <CardHeader className="flex flex-row gap-4 items-center">
                    <Avatar><AvatarFallback>{post.author_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback></Avatar>
                    <div><CardTitle>{post.title}</CardTitle><p className="text-sm text-gray-500">Posted by {post.author_name} on {new Date(post.created_at).toLocaleDateString()}</p></div>
                </CardHeader>
                <CardContent><p className="whitespace-pre-wrap">{post.content}</p></CardContent>
            </Card>

            {/* Replies */}
            <h3 className="text-xl font-bold mt-4">Replies ({replies.length})</h3>
            <div className="space-y-4">
                {replies.map(reply => (
                    <Card key={reply.id} className="bg-gray-50">
                        <CardHeader className="flex flex-row gap-3 items-center text-sm">
                            <Avatar className="h-8 w-8"><AvatarFallback>{reply.author_name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback></Avatar>
                            <div><p className="font-semibold">{reply.author_name}</p><p className="text-xs text-gray-500">{new Date(reply.created_at).toLocaleString()}</p></div>
                        </CardHeader>
                        <CardContent><p>{reply.content}</p></CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Reply Form */}
            <Card>
                <CardHeader><CardTitle>Add Your Reply</CardTitle></CardHeader>
                <CardContent><Textarea rows={4} placeholder="Share your thoughts..." value={newReply} onChange={(e) => setNewReply(e.target.value)} /></CardContent>
                <CardFooter><Button onClick={handleAddReply} disabled={!user}>Post Reply</Button></CardFooter>
            </Card>
        </div>
    );
}