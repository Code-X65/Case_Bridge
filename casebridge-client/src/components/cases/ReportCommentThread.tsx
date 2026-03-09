import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send, User, Loader2, Paperclip, X, FileText } from 'lucide-react';

interface CommentDoc {
    id: string;
    document: {
        id: string;
        filename: string;
        file_url: string;
    };
}

interface Comment {
    id: string;
    content: string;
    author_id: string;
    created_at: string;
    author_role?: string;
    docs?: CommentDoc[];
}

interface ReportCommentThreadProps {
    updateId: string;
}

export default function ReportCommentThread({ updateId }: ReportCommentThreadProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showInput, setShowInput] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchComments = async () => {
            const { data, error } = await supabase
                .from('matter_update_comments')
                .select(`
                    *,
                    docs:matter_comment_documents (
                        id,
                        document:document_id (
                            id,
                            filename,
                            file_url
                        )
                    )
                `)
                .eq('update_id', updateId)
                .order('created_at', { ascending: true });

            if (error) console.error("Error fetching comments:", error);
            else setComments(data || []);
            setLoading(false);
        };

        if (updateId) fetchComments();

        // Subscription
        const channel = supabase
            .channel(`report_comments:${updateId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matter_update_comments',
                    filter: `update_id=eq.${updateId}`
                },
                (payload) => {
                    setComments((current) => [...current, payload.new as Comment]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [updateId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user || !updateId) return;

        setSubmitting(true);
        try {
            // 1. Post Comment
            const { data: comment, error: commentError } = await supabase
                .from('matter_update_comments')
                .insert({
                    update_id: updateId,
                    author_id: user.id,
                    content: newComment.trim()
                })
                .select()
                .single();

            if (commentError) throw commentError;

            // 2. Handle Document Uploads if any
            if (selectedFiles.length > 0) {
                setUploading(true);
                for (const file of selectedFiles) {
                    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                    const filePath = `reports/${updateId}/comments/${comment.id}/${sanitizedName}`;

                    // Upload to storage
                    const { error: uploadError } = await supabase.storage
                        .from('case_documents')
                        .upload(filePath, file);

                    if (uploadError) {
                        console.error("Upload error:", uploadError);
                        continue;
                    }

                    // Create document record
                    const { data: doc, error: docError } = await supabase
                        .from('documents')
                        .insert({
                            filename: file.name,
                            file_url: filePath,
                            uploaded_by_user_id: user.id,
                            uploaded_by_role: 'client'
                        })
                        .select()
                        .single();

                    if (docError) {
                        console.error("Doc record error:", docError);
                        continue;
                    }

                    // Link document to comment
                    if (doc) {
                        await supabase
                            .from('matter_comment_documents')
                            .insert({
                                comment_id: comment.id,
                                document_id: doc.id
                            });
                    }
                }
                setUploading(false);
            }

            setNewComment('');
            setSelectedFiles([]);
            setShowInput(false);
            
            // Re-fetch comments to show the new ones with docs
            // (Alternatively, the subscription would trigger but it won't have the docs pre-joined)
            const { data: refreshedData } = await supabase
                .from('matter_update_comments')
                .select(`
                    *,
                    docs:matter_comment_documents (
                        id,
                        document:document_id (
                            id,
                            filename,
                            file_url
                        )
                    )
                `)
                .eq('update_id', updateId)
                .order('created_at', { ascending: true });
            if (refreshedData) setComments(refreshedData);

        } catch (error) {
            console.error("Error posting comment:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage.from('case_documents').createSignedUrl(fileUrl, 60);
        if (data) window.open(data.signedUrl, '_blank');
    };

    if (loading) return null;

    return (
        <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center justify-between mb-4">
                <button 
                    onClick={() => setShowInput(!showInput)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                    <MessageSquare size={14} />
                    {comments.length > 0 ? `${comments.length} Comments` : 'Add Comment'}
                </button>
            </div>

            <div className="space-y-4">
                {comments.map((comment) => {
                    const isMe = comment.author_id === user?.id;
                    return (
                        <div key={comment.id} className="flex gap-4 animate-in fade-in duration-300">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                isMe ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-input border-border text-muted-foreground'
                            }`}>
                                <User size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-foreground">
                                        {isMe ? 'You' : 'Legal Team'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground uppercase">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {comment.content}
                                </p>

                                {comment.docs && comment.docs.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {comment.docs.map((d) => (
                                            <button
                                                key={d.id}
                                                onClick={() => handleDownload(d.document.file_url)}
                                                className="flex items-center gap-2 bg-input border border-border px-3 py-1.5 rounded-lg text-[9px] font-bold text-foreground hover:border-primary/50 transition-all group/doc"
                                            >
                                                <FileText size={12} className="text-primary group-hover/doc:scale-110 transition-transform" />
                                                <span className="truncate max-w-[150px]">{d.document.filename}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {showInput && (
                    <form onSubmit={handleSubmit} className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your comment or question..."
                            className="w-full bg-input border border-border rounded-xl p-4 text-xs text-foreground focus:ring-2 focus:ring-primary shadow-neumorph-inset outline-none transition-all min-h-[80px] resize-none"
                        />
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20 text-[9px] font-bold">
                                        <FileText size={10} /> <span className="max-w-[150px] truncate">{f.name}</span>
                                        <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-foreground"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center gap-2">
                                <label className="flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase">
                                    <Paperclip size={12} />
                                    <span>Attach Files</span>
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        onChange={(e) => {
                                            if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                        }}
                                    />
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowInput(false)}
                                        className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || uploading || !newComment.trim()}
                                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-neumorph flex items-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {(submitting || uploading) ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
