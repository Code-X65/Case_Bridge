import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { Send, Shield, Loader2, Check, Paperclip, CornerUpLeft, X } from 'lucide-react';

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
    } | null;
}

interface MatterChatProps {
    matterId: string;
}

export default function MatterChat({ matterId }: MatterChatProps) {
    const { session } = useInternalSession();
    const user = session;
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState<Message | null>(null);

    const QUICK_REPLIES = [
        "I've reviewed your evidence.",
        "Please provide more details.",
        "Let's discuss this in our next call.",
        "Working on the next update now.",
        "The case is progressing well."
    ];
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Use API_URL from env, with development fallback
    const API_URL = import.meta.env.VITE_API_URL || 
        (import.meta.env.DEV ? 'http://localhost:5000/api' : undefined);
    
    if (!API_URL) {
        throw new Error('VITE_API_URL is not configured. Please set it in your environment variables.');
    }

    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            
            // Fetch messages from the API
            try {
                const response = await fetch(`${API_URL}/matters/${matterId}/messages`);
                if (!response.ok) {
                    console.error(`Failed to fetch messages: ${response.status}`);
                    setMessages([]);
                    setLoading(false);
                    return;
                }
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
                    
                    // Mark as read via API
                    const readRes = await fetch(`${API_URL}/matters/${matterId}/messages/read`, {
                        method: 'PATCH'
                    });
                    if (!readRes.ok) {
                        console.error(`Failed to mark messages as read: ${readRes.status}`);
                    }
                }
            } catch (error) {
                console.error("Error fetching messages via API:", error);
            }
            
            setLoading(false);
            scrollToBottom();
        };

        if (matterId) fetchMessages();

        const channel = supabase
            .channel(`matter_messages_internal:${matterId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'matter_messages',
                    filter: `matter_id=eq.${matterId}`
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
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
                            
                            // If it's from the client, mark as read
                            if (data.sender_id !== user?.user_id) {
                                await supabase.rpc('mark_matter_messages_read', { p_matter_id: matterId });
                            }
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setMessages((current) => 
                            current.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
                        );
                    }
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [matterId, user?.user_id]);

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
                    sender_id: user.user_id,
                    content: newMessage,
                    reply_to_id: replyTo?.id
                })
            });

            if (!response.ok) {
                console.error(`Failed to send message: ${response.status}`);
            }

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
                <Loader2 className="animate-spin text-indigo-500" size={24} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-[#0F172A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-white">Case Communication Bridge</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black italic">Direct Client Line</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B141A] scroll-smooth relative"
                style={{ 
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'
                }}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                        <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-4">
                            <Send size={24} className="text-white" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-white">No discussion yet</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === user?.user_id;
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
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">
                                                {msg.sender?.full_name || 'Client'}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className={`relative px-4 py-2.5 shadow-sm transition-all ${
                                        isMe 
                                        ? 'bg-[#005C4B] text-slate-100 rounded-2xl rounded-tr-none' 
                                        : 'bg-[#202C33] text-slate-100 rounded-2xl rounded-tl-none'
                                    }`}>
                                        {/* Reply Icon (Hover) */}
                                        <button 
                                            onClick={() => setReplyTo(msg)}
                                            className={`absolute top-0 p-1.5 bg-slate-800/80 backdrop-blur rounded-full shadow-lg opacity-0 group-hover/msg:opacity-100 transition-opacity z-10 ${
                                                isMe ? '-left-10' : '-right-10'
                                            } text-indigo-400 hover:scale-110 active:scale-95`}
                                        >
                                            <CornerUpLeft size={14} />
                                        </button>

                                        {/* Tail */}
                                        <div className={`absolute top-0 w-2 h-2 ${
                                            isMe 
                                            ? '-right-1.5 bg-[#005C4B] [clip-path:polygon(0%_0%,100%_0%,0%_100%)]' 
                                            : '-left-1.5 bg-[#202C33] [clip-path:polygon(0%_0%,100%_0%,100%_100%)]'
                                        }`} />

                                        {/* Nested Reply Context */}
                                        {msg.reply_to_id && (
                                            <div className="mb-2 p-2 rounded-lg border-l-4 border-indigo-500 text-xs bg-white/5">
                                                <p className="font-black text-[10px] uppercase text-indigo-400 mb-1">
                                                    {msg.reply_sender_name || 'Previous Message'}
                                                </p>
                                                <p className="opacity-70 truncate italic text-white/80">
                                                    {msg.reply_content}
                                                </p>
                                            </div>
                                        )}

                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.content.split(/(@\w+)/g).map((part, i) => (
                                                part.startsWith('@') ? (
                                                    <span key={i} className="text-indigo-400 font-bold hover:underline cursor-pointer">{part}</span>
                                                ) : part
                                            ))}
                                        </p>
                                        
                                        <div className="flex items-center justify-end gap-1 mt-1 text-slate-400">
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
            <div className="bg-white/5 border-t border-white/10">
                {/* Suggestions / Quick Replies */}
                <div className="flex items-center gap-2 overflow-x-auto p-4 pb-0 no-scrollbar">
                    {QUICK_REPLIES.map((reply, i) => (
                        <button
                            key={i}
                            onClick={() => setNewMessage(reply)}
                            className="whitespace-nowrap px-4 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                        >
                            {reply}
                        </button>
                    ))}
                </div>

                {/* Reply Preview */}
                {replyTo && (
                    <div className="px-4 py-2 bg-indigo-500/5 border-b border-white/5 flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <CornerUpLeft size={12} className="text-indigo-400 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-indigo-400 uppercase leading-none mb-1">Replying to {replyTo.sender?.full_name || 'Client'}</p>
                                <p className="text-xs text-slate-400 truncate italic">"{replyTo.content}"</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setReplyTo(null)}
                            className="p-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                
                <form 
                    onSubmit={handleSendMessage}
                    className="p-4 flex items-end gap-3"
                >
                    <div className="flex gap-2 text-slate-400 mb-2.5">
                        <button type="button" className="hover:text-indigo-400 transition-colors"><Paperclip size={18} /></button>
                    </div>
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
                            placeholder="Type a secure message..."
                            rows={1}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white resize-none max-h-32 overflow-y-auto"
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
                        className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center h-[44px] w-[44px] shrink-0"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
}
