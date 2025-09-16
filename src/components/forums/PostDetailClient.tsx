'use client';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { createClientComponentClient, User } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, MessageSquare, Reply, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    post_id: string;
    parent_reply_id?: string;
    profiles?: { full_name: string };
    forum_votes?: { user_id: string }[];
    upvote_count?: number;
    downvote_count?: number;
}

interface Post {
    id: string;
    title: string;
    content: string;
    created_at: string;
    author_id: string;
    profiles?: { full_name: string };
    forum_votes?: { user_id: string }[];
    upvote_count?: number;
    downvote_count?: number;
}

interface PostDetailClientProps {
    initialPost: Post;
    initialComments: Comment[];
    user: User;
}

export function PostDetailClient({ initialPost, initialComments, user }: PostDetailClientProps) {
    const supabase = createClientComponentClient();
    const [post, setPost] = useState(initialPost);
    const [comments, setComments] = useState(initialComments);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const { register, handleSubmit, reset } = useForm();

    const fetchComments = useCallback(async () => {
        const { data } = await supabase
            .from('forum_replies')
            .select(`
                *,
                profiles ( full_name ),
                forum_votes ( user_id ),
                parent_reply_id
            `)
            .eq('post_id', post.id)
            .order('created_at', { ascending: true });
        
        if (data) setComments(data);
    }, [supabase, post.id]);

    const handleVote = async (itemId: string, itemType: 'post' | 'comment', voteType: 'up' | 'down') => {
        // Optimistic update
        if (itemType === 'post') {
            const userHasVoted = post.forum_votes?.some((v: any) => v.user_id === user.id);
            const newVotes = userHasVoted ? [] : [{ user_id: user.id }];
            
            setPost(prev => ({
                ...prev,
                upvote_count: voteType === 'up' ? (prev.upvote_count || 0) + (userHasVoted ? 0 : 1) : (prev.upvote_count || 0),
                downvote_count: voteType === 'down' ? (prev.downvote_count || 0) + (userHasVoted ? 0 : 1) : (prev.downvote_count || 0),
                forum_votes: newVotes
            }));
        } else {
            setComments(prev => prev.map(comment => {
                if (comment.id === itemId) {
                    const userHasVoted = comment.forum_votes?.some((v: any) => v.user_id === user.id);
                    const newVotes = userHasVoted ? [] : [{ user_id: user.id }];
                    
                    return {
                        ...comment,
                        upvote_count: voteType === 'up' ? (comment.upvote_count || 0) + (userHasVoted ? 0 : 1) : (comment.upvote_count || 0),
                        downvote_count: voteType === 'down' ? (comment.downvote_count || 0) + (userHasVoted ? 0 : 1) : (comment.downvote_count || 0),
                        forum_votes: newVotes
                    };
                }
                return comment;
            }));
        }

        // Actual DB call
        await supabase.rpc('toggle_vote', { 
            item_id: itemId, 
            item_type: itemType,
            vote_type: voteType
        });
    };

    const handleAddComment = async (formData: any) => {
        const content = formData.content || newComment;
        if (!content.trim()) return;

        const { error } = await supabase.from('forum_replies').insert({
            author_id: user.id,
            post_id: post.id,
            content: content.trim(),
            parent_reply_id: replyingTo || null
        });

        if (error) {
            toast.error("Failed to post comment: " + error.message);
        } else {
            toast.success("Comment posted!");
            reset();
            setNewComment('');
            setReplyingTo(null);
            fetchComments();
        }
    };

    const renderComment = (comment: Comment, depth = 0) => {
        const userHasVoted = comment.forum_votes?.some((v: any) => v.user_id === user.id);
        const replies = comments.filter(c => c.parent_reply_id === comment.id);
        
        return (
            <div key={comment.id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
                <Card className="mb-4">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    {comment.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">
                                    {comment.profiles?.full_name || 'Unknown User'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant={userHasVoted ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleVote(comment.id, 'comment', 'up')}
                                >
                                    <ArrowUp className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-bold px-1">
                                    {(comment.upvote_count || 0) - (comment.downvote_count || 0)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVote(comment.id, 'comment', 'down')}
                                >
                                    <ArrowDown className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        <div className="flex gap-2 mt-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            >
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                            </Button>
                        </div>
                        
                        {/* Reply form */}
                        {replyingTo === comment.id && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                <form onSubmit={handleSubmit(handleAddComment)} className="space-y-3">
                                    <div>
                                        <Label htmlFor={`reply-${comment.id}`}>Reply to {comment.profiles?.full_name}</Label>
                                        <Textarea
                                            id={`reply-${comment.id}`}
                                            rows={3}
                                            placeholder="Write your reply..."
                                            {...register("content")}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="submit" size="sm">Post Reply</Button>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setReplyingTo(null)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>
                
                {/* Render nested replies */}
                {replies.map(reply => renderComment(reply, depth + 1))}
            </div>
        );
    };

    const topLevelComments = comments.filter(c => !c.parent_reply_id);
    const userHasVotedPost = post.forum_votes?.some((v: any) => v.user_id === user.id);

    return (
        <div className="flex flex-col gap-6">
            <Link href="/teacher/plc-forum" className="flex items-center gap-2 text-sm text-gray-600 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to all discussions
            </Link>
            
            {/* Main Post */}
            <Card>
                <CardHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center gap-1">
                            <Button
                                variant={userHasVotedPost ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleVote(post.id, 'post', 'up')}
                            >
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                            <span className="font-bold text-sm">
                                {(post.upvote_count || 0) - (post.downvote_count || 0)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVote(post.id, 'post', 'down')}
                            >
                                <ArrowDown className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <Avatar>
                                    <AvatarFallback>
                                        {post.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Posted by {post.profiles?.full_name || 'Unknown User'} • {new Date(post.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <CardTitle className="text-2xl mb-4">{post.title}</CardTitle>
                            <CardContent className="p-0">
                                <p className="whitespace-pre-wrap text-gray-800">{post.content}</p>
                            </CardContent>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <h3 className="text-xl font-bold">Comments ({comments.length})</h3>
                </div>

                {/* Add Comment Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Add a Comment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(handleAddComment)} className="space-y-4">
                            <div>
                                <Label htmlFor="new-comment">Your comment</Label>
                                <Textarea
                                    id="new-comment"
                                    rows={4}
                                    placeholder="Share your thoughts..."
                                    {...register("content", { required: true })}
                                />
                            </div>
                            <Button type="submit">Post Comment</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Comments List */}
                <div className="space-y-4">
                    {topLevelComments.map(comment => renderComment(comment))}
                </div>
            </div>
        </div>
    );
}
