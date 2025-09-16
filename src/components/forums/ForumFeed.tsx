'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { ArrowUp, MessageSquare, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ForumFeed({ initialPosts, user }: { initialPosts: any[], user: User }) {
    const [posts, setPosts] = useState(initialPosts);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const supabase = createClientComponentClient();
    const { register, handleSubmit, reset } = useForm();

    const fetchPosts = async () => {
        const { data } = await supabase
            .from('forum_posts')
            .select(`
                *,
                profiles ( full_name ),
                forum_replies ( count ),
                forum_votes ( user_id )
            `)
            .order('created_at', { ascending: false });
        
        if (data) setPosts(data);
    };

    const handleCreatePost = async (formData: any) => {
        const promise = supabase.rpc('create_forum_post', {
            title_input: formData.title,
            content_input: formData.content,
            category_input: formData.category || 'general'
        });
        
        toast.promise(promise, {
            loading: 'Posting your discussion...',
            success: () => {
                reset();
                fetchPosts();
                setIsDialogOpen(false);
                return "Discussion started successfully!";
            },
            error: (err) => `Failed to create post: ${err.message}`,
        });
    };
    
    const handleVote = async (postId: string) => {
        // Optimistic update
        const newPosts = posts.map(p => {
            if (p.id === postId) {
                const userHasVoted = p.forum_votes.some((v: any) => v.user_id === user.id);
                return {
                    ...p,
                    upvote_count: userHasVoted ? p.upvote_count - 1 : p.upvote_count + 1,
                    forum_votes: userHasVoted ? [] : [{ user_id: user.id }]
                };
            }
            return p;
        });
        setPosts(newPosts);

        // Actual DB call
        await supabase.rpc('toggle_vote', { item_id: postId, item_type: 'post' });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">PLC Forum</h1>
                    <p className="text-gray-500">Collaborate with fellow educators.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg">
                            <PlusCircle className="mr-2 h-4 w-4" /> Start New Discussion
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Start a New Discussion</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(handleCreatePost)} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input 
                                    placeholder="A clear, concise title for your topic..." 
                                    {...register("title", { required: true })} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select {...register("category")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">General Discussion</SelectItem>
                                        <SelectItem value="teaching">Teaching Strategies</SelectItem>
                                        <SelectItem value="curriculum">Curriculum</SelectItem>
                                        <SelectItem value="assessment">Assessment</SelectItem>
                                        <SelectItem value="technology">Technology</SelectItem>
                                        <SelectItem value="professional-development">Professional Development</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea 
                                    placeholder="Share your thoughts, ask a question..." 
                                    rows={6} 
                                    {...register("content", { required: true })} 
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Post Discussion
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
            
            <div className="space-y-4">
                {posts.map(post => {
                    const userHasVoted = post.forum_votes?.some((v: any) => v.user_id === user.id) || false;
                    return (
                        <div key={post.id} className="flex gap-4 bg-white p-4 rounded-lg border">
                            <div className="flex flex-col items-center gap-1">
                                <Button 
                                    variant={userHasVoted ? 'default' : 'outline'} 
                                    size="sm" 
                                    onClick={() => handleVote(post.id)}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-sm">{post.upvote_count || 0}</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500">
                                    Posted by {post.profiles?.full_name || 'Unknown User'} • {new Date(post.created_at).toLocaleDateString()}
                                </p>
                                <Link href={`/teacher/plc-forum/${post.id}`}>
                                    <h3 className="font-bold text-lg hover:underline">{post.title}</h3>
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                    <MessageSquare className="h-4 w-4" /> 
                                    {post.forum_replies?.[0]?.count || 0} comments
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
