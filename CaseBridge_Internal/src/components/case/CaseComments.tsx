import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';

interface CaseCommentsProps {
    matterId: string;
}

export default function CaseComments({ matterId }: CaseCommentsProps) {
    const { session } = useInternalSession();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isAdminOrCM = session?.role === 'admin_manager' || session?.role === 'case_manager';

    useEffect(() => {
        if (!matterId) return;
        fetchComments();

        // Subscribe to real-time comment updates
        const channel = supabase
            .channel(`comments_${matterId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'case_comments',
                    filter: `matter_id=eq.${matterId}`
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matterId]);

    const fetchComments = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('case_comments')
            .select(`
                *,
                author:author_id (
                    full_name,
                    email
                )
            `)
            .eq('matter_id', matterId)
            .order('created_at', { ascending: true });

        if (data) setComments(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !isAdminOrCM) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('case_comments')
                .insert({
                    matter_id: matterId,
                    author_id: session?.user_id,
                    comment_text: newComment.trim(),
                    is_internal: true
                });

            if (error) throw error;

            setNewComment('');
            fetchComments();
        } catch (err: any) {
            alert('Error posting comment: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;

        const { error } = await supabase
            .from('case_comments')
            .delete()
            .eq('id', commentId);

        if (!error) fetchComments();
    };

    if (!isAdminOrCM) return null;

    return (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Internal Case Notes
            </h3>

            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-4">
                        No internal notes yet. Start the conversation.
                    </p>
                ) : (
                    comments.map(comment => (
                        <div
                            key={comment.id}
                            className="bg-white/5 rounded-xl p-4 border border-white/5 group hover:border-indigo-500/20 transition-all"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-white">
                                        {comment.author?.full_name || 'Staff Member'}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {new Date(comment.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {comment.author_id === session?.user_id && (
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                {comment.comment_text}
                            </p>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add an internal note (visible to Admin & Case Managers only)..."
                    className="flex-1 bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    rows={2}
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
            </form>

            <p className="text-[10px] text-slate-600 italic mt-3">
                💡 These notes are internal only and never visible to clients or associates.
            </p>
        </div>
    );
}
