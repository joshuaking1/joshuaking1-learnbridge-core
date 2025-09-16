// src/app/(dashboard)/teacher/plc-forum/[postId]/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PostDetailClient } from '@/components/forums/PostDetailClient';

interface PostPageProps {
    params: {
        postId: string;
    };
}

export default async function PostPage({ params }: PostPageProps) {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookies().get(name)?.value;
                },
            },
        }
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/auth/login');

    // Fetch the main post with author info and voting data
    const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .select(`
            *,
            profiles ( full_name ),
            forum_votes ( user_id )
        `)
        .eq('id', params.postId)
        .single();

    if (postError || !post) {
        return (
            <div className="text-center p-12">
                <h2 className="text-xl font-semibold">Post not found.</h2>
                <p className="text-gray-500">It may have been deleted or the link is incorrect.</p>
            </div>
        );
    }

    // Fetch nested comments with author info and voting data
    const { data: comments, error: commentsError } = await supabase
        .from('forum_replies')
        .select(`
            *,
            profiles ( full_name ),
            forum_votes ( user_id ),
            parent_reply_id
        `)
        .eq('post_id', params.postId)
        .order('created_at', { ascending: true });

    if (commentsError) {
        console.error('Error fetching comments:', commentsError);
    }

    return (
        <PostDetailClient 
            initialPost={post} 
            initialComments={comments || []} 
            user={session.user} 
        />
    );
}