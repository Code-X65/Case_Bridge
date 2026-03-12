import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Shield, Loader2, Lock, Check, CornerUpLeft, X } from 'lucide-react';

interface Message {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    is_read: boolean;
    reply_to_id?: string;
    reply_content?: string;
    reply_sender_name?: string;
    sender: {
        full_name?: string;
        role?: string;
        first_name?: string;
        last_name?: string;
    } | null;
}

interface CaseGroupChatProps {
    matterId: string;
}

export default function CaseGroupChat({ matterId }: CaseGroupChatProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isChatEnabled, setIsChatEnabled] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const QUICK_REPLIES = [
        "Thank you!",
        "Got it, thanks.",
        "When is our next meeting?",
        "I'll upload the docs shortly.",
        "Please call me."
    ];

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            
            // Fetch matter status
            const { data: matter, error: matterError } = await supabase
                .from('matters')
                .select('is_chat_enabled')
                .eq('id', matterId)
                .single();
            
            if (matterError) console.error("Error fetching matter status:", matterError);
            else setIsChatEnabled(matter?.is_chat_enabled || false);
            // Fetch messages from the API
            try {
                const response = await fetch(`${API_URL}/matters/${matterId}/messages`);
                const result = await response.json();

                if (result.success) {
                    const formattedMessages = (result.data || []).map((msg: any) => ({
                        ...msg,
                        sender: {
                            full_name: msg.sender_name,
                            role: msg.sender_role
                        }
                    }));
                    setMessages(formattedMessages);
                    
                    // Mark messages as read via API
                    await fetch(`${API_URL}/matters/${matterId}/messages/read`, {
                        method: 'PATCH'
                    });
                }
            } catch (error) {
                console.error("Error fetching messages from API:", error);
            }
            
            setLoading(false);
            scrollToBottom();
        };

        if (matterId) fetchInitialData();

        // Real-time subscription for messages
        const messageChannel = supabase
            .channel(`matter_messages:${matterId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matter_messages',
                    filter: `matter_id=eq.${matterId}`
                },
                async (payload) => {
                    // Fetch the full message from the view
                    const { data } = await supabase
                        .from('matter_messages_view')
                        .select('*')
                        .eq('id', payload.new.id)
                        .single();
                    
                    if (data) {
                        const formatted = {
                            ...data,
                            sender: {
                                full_name: data.sender_name,
                                role: data.sender_role
                            }
                        };
                        setMessages((current) => [...current, formatted]);
                        
                        // If it's from staff, mark as read
                        if (data.sender_id !== user?.id) {
                            await supabase.rpc('mark_matter_messages_read', { p_matter_id: matterId });
                        }
                    }
                    scrollToBottom();
                }
            )
            .subscribe();

        // Real-time subscription for matter status
        const matterChannel = supabase
            .channel(`matter_status:${matterId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matters',
                    filter: `id=eq.${matterId}`
                },
                (payload) => {
                    if (payload.new.is_chat_enabled !== undefined) {
                        setIsChatEnabled(payload.new.is_chat_enabled);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(matterChannel);
        };
    }, [matterId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !user || !matterId) return;

        setSending(true);
        try {
            const response = await fetch(`${API_URL}/matters/${matterId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sender_id: user.id,
                    content: newMessage.trim(),
                    reply_to_id: replyTo?.id || null,
                    mentions: [] // To be implemented with mention list
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                console.error("Error sending message via API:", result.error);
            } else {
                setNewMessage('');
                setReplyTo(null);
            }
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-primary" size={24} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px] bg-card border border-border rounded-[2rem] overflow-hidden shadow-neumorph">
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-foreground">Legal Team Chat</h3>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Confidential Channel</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                ref= {scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#E5DDD5] dark:bg-[#0B141A] scroll-smooth relative"
                style={{ 
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'
                }}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                        <div className="w-16 h-16 rounded-full bg-input border border-border flex items-center justify-center mb-4">
                            <Send size={24} className="text-muted-foreground" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-foreground">No messages yet</p>
                        <p className="text-[10px] max-w-[200px] mt-2 text-foreground">Start the conversation with your legal team.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user?.id;
                        const prevMsg = messages[idx - 1];
                        const showAvatar = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                        
                        return (
                            <div 
                                key={msg.id} 
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 group/msg`}
                            >
                                <div className={`max-w-[85%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                                    {!isMe && showAvatar && (
                                        <div className="flex items-center gap-1.5 mb-1 px-1">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-tight">
                                                {msg.sender?.full_name || 'Legal Staff'}
                                            </span>
                                            {msg.sender?.role && (
                                                <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold uppercase border border-primary/20">
                                                    {msg.sender.role.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className={`relative px-4 py-2.5 shadow-sm transition-all ${
                                        isMe 
                                        ? 'bg-[#DCF8C6] dark:bg-[#005C4B] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tr-none' 
                                        : 'bg-white dark:bg-[#202C33] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none'
                                    }`}>
                                        {/* Reply Icon (Hover) */}
                                        <button 
                                            onClick={() => setReplyTo(msg)}
                                            className={`absolute top-0 p-1.5 bg-card/80 backdrop-blur rounded-full shadow-lg opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 ${
                                                isMe ? '-left-10' : '-right-10'
                                            } text-primary hover:scale-110 active:scale-95`}
                                        >
                                            <CornerUpLeft size={14} />
                                        </button>

                                        {/* Tail */}
                                        <div className={`absolute top-0 w-2 h-2 ${
                                            isMe 
                                            ? '-right-1.5 bg-[#DCF8C6] dark:bg-[#005C4B] [clip-path:polygon(0%_0%,100%_0%,0%_100%)]' 
                                            : '-left-1.5 bg-white dark:bg-[#202C33] [clip-path:polygon(0%_0%,100%_0%,100%_100%)]'
                                        }`} />

                                        {/* Nested Reply Context */}
                                        {msg.reply_to_id && (
                                            <div className={`mb-2 p-2 rounded-lg border-l-4 text-xs bg-black/5 dark:bg-white/5 ${
                                                isMe ? 'border-primary/40' : 'border-primary'
                                            }`}>
                                                <p className="font-black text-[10px] uppercase text-primary mb-1">
                                                    {msg.reply_sender_name || 'Previous Message'}
                                                </p>
                                                <p className="opacity-70 truncate italic">
                                                    {msg.reply_content}
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.content.split(/(@\w+)/g).map((part, i) => (
                                                part.startsWith('@') ? (
                                                    <span key={i} className="text-primary font-bold hover:underline cursor-pointer">{part}</span>
                                                ) : part
                                            ))}
                                        </p>
                                        
                                        <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500'}`}>
                                            <span className="text-[9px] font-medium">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                <div className="flex ml-0.5">
                                                    <Check size={10} className={msg.is_read ? 'text-blue-500' : 'text-slate-400'} />
                                                    <Check size={10} className={`-ml-1.5 ${msg.is_read ? 'text-blue-500' : 'text-slate-400'}`} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input Area */}
            {isChatEnabled ? (
                <div className="bg-card border-t border-border">
                    {/* Quick Replies */}
                    <div className="flex items-center gap-2 overflow-x-auto p-4 pb-0 no-scrollbar">
                        {QUICK_REPLIES.map((reply, i) => (
                            <button
                                key={i}
                                onClick={() => setNewMessage(reply)}
                                className="whitespace-nowrap px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>

                    {/* Reply Preview */}
                    {replyTo && (
                        <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <CornerUpLeft size={12} className="text-primary shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-primary uppercase leading-none mb-1">Replying to {replyTo.sender?.full_name || 'Legal Staff'}</p>
                                    <p className="text-xs text-muted-foreground truncate italic">"{replyTo.content}"</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setReplyTo(null)}
                                className="p-1 hover:bg-primary/10 rounded-full text-muted-foreground hover:text-primary transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    
                    <form 
                        onSubmit={handleSendMessage}
                        className="p-4 flex items-end gap-3"
                    >
                        <div className="flex-1 relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                                placeholder="Type your message..."
                                rows={1}
                                className="w-full bg-input border border-border rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-primary shadow-neumorph-inset outline-none transition-all resize-none max-h-32 overflow-y-auto"
                                style={{ height: 'auto', minHeight: '44px' }}
                                ref={(el) => {
                                    if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="p-3 bg-primary text-primary-foreground rounded-xl shadow-neumorph hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center h-[44px] w-[44px] shrink-0"
                        >
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="p-6 bg-input/5 border-t border-border flex flex-col items-center justify-center text-center gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs uppercase tracking-widest">
                        <Lock size={14} />
                        Messaging is currently disabled
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 max-w-[250px]">
                        The group chat for this case hasn't been activated by your legal team yet. Please wait for an update.
                    </p>
                </div>
            )}
        </div>
    );
}
