import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Send,
    MessageSquare,
    Briefcase,
    Shield,
    Upload,
    MoreVertical,
    CheckCheck
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function MessagesPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const caseIdParam = searchParams.get('case');

    const [matters, setMatters] = useState<any[]>([]);
    const [selectedMatter, setSelectedMatter] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch all matters for the sidebar
    useEffect(() => {
        const fetchMatters = async () => {
            const { data } = await supabase
                .from('matters')
                .select('*')
                .eq('client_id', user?.id)
                .order('created_at', { ascending: false });

            if (data) {
                setMatters(data);
                // Auto-select based on param or first matter
                if (caseIdParam) {
                    const found = data.find(m => m.id === caseIdParam);
                    if (found) setSelectedMatter(found);
                } else if (data.length > 0) {
                    setSelectedMatter(data[0]);
                }
            }
            setLoading(false);
        };

        if (user) fetchMatters();
    }, [user, caseIdParam]);

    // 2. Fetch messages for the selected matter
    useEffect(() => {
        if (!selectedMatter) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('case_messages')
                .select('*')
                .eq('matter_id', selectedMatter.id)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
        };

        fetchMessages();

        // Real-time subscription
        const channel = supabase.channel(`messages:${selectedMatter.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'case_messages',
                filter: `matter_id=eq.${selectedMatter.id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedMatter]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedMatter || sending) return;

        setSending(true);
        const { error } = await supabase
            .from('case_messages')
            .insert({
                matter_id: selectedMatter.id,
                sender_id: user?.id,
                sender_role: 'client',
                message_body: newMessage.trim()
            });

        if (!error) {
            setNewMessage('');
        }
        setSending(false);
    };

    const [showListOnMobile, setShowListOnMobile] = useState(true);

    // Auto-select based on param or first matter
    useEffect(() => {
        if (selectedMatter) {
            setShowListOnMobile(false);
        }
    }, [selectedMatter]);

    useGSAP(() => {
        if (!loading) {
            gsap.from('.message-thread', {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
            gsap.from('.matter-list', {
                opacity: 0,
                duration: 0.5,
                ease: 'power2.out'
            });
        }
    }, [loading]);

    if (loading) {
        return (
            <>
                <div className="flex justify-center py-20 px-4">
                    <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-160px)] flex gap-0 sm:gap-6 overflow-hidden relative">
                {/* Sidebar: Case Selector */}
                <div className={`matter-list w-full sm:w-80 flex flex-col gap-4 transition-all duration-300 ${!showListOnMobile && 'hidden sm:flex'}`}>
                    <div className="px-2">
                        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Messages</h1>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Case Active Threads</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-0 sm:pr-2 custom-scrollbar px-2 sm:px-0 pb-20 sm:pb-0">
                        {matters.length === 0 ? (
                            <div className="glass-card p-6 text-center opacity-50">
                                <p className="text-xs italic">No active cases with messaging.</p>
                            </div>
                        ) : (
                            matters.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        setSelectedMatter(m);
                                        setShowListOnMobile(false);
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all group ${selectedMatter?.id === m.id
                                        ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5'
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Briefcase size={14} className={selectedMatter?.id === m.id ? 'text-blue-400' : 'text-muted-foreground'} />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate">{m.title}</span>
                                    </div>
                                    <h3 className={`font-bold text-sm truncate ${selectedMatter?.id === m.id ? 'text-white' : 'text-slate-400'}`}>
                                        {m.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[9px] sm:text-[10px] opacity-50 font-bold">{new Date(m.created_at).toLocaleDateString()}</span>
                                        {selectedMatter?.id === m.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`message-thread flex-1 glass-card flex flex-col overflow-hidden relative border-none bg-slate-900/40 transition-all duration-300 ${showListOnMobile && 'hidden sm:flex'}`}>
                    {!selectedMatter ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                                <MessageSquare size={32} className="text-muted-foreground/20 sm:w-10 sm:h-10" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-2">Select a Case</h3>
                            <p className="text-muted-foreground max-w-xs text-xs sm:text-sm">Choose an active case from the sidebar to view your secure message thread.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-4 sm:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <button
                                        onClick={() => setShowListOnMobile(true)}
                                        className="sm:hidden p-2 -ml-2 text-muted-foreground hover:text-white"
                                    >
                                        <Briefcase size={20} />
                                    </button>
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                                        <Shield size={20} className="sm:w-6 sm:h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-black text-base sm:text-lg leading-tight truncate">{selectedMatter.title}</h2>
                                        <p className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Secure Legal Channel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <Link to={`/cases/${selectedMatter.case_report_id}`} className="hidden xs:block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                                        View Case
                                    </Link>
                                    <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg">
                                        <MoreVertical size={18} sm:size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-xs sm:text-sm text-center px-6">
                                        <p>Secure message encryption active.</p>
                                        <p>Send a message to start the conversation.</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isClient = msg.sender_role === 'client';
                                        return (
                                            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] sm:max-w-[70%] ${isClient ? 'order-2' : ''}`}>
                                                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${isClient ? 'flex-row-reverse' : ''}`}>
                                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            {isClient ? 'You' : msg.sender_role.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[8px] opacity-30 font-bold">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl text-sm leading-relaxed shadow-sm break-words ${isClient
                                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                                        : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                                                        }`}>
                                                        {msg.message_body}
                                                    </div>
                                                    {isClient && (
                                                        <div className="flex justify-end mt-1 px-2">
                                                            <CheckCheck size={12} className="text-blue-500 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <div className="p-4 sm:p-6 bg-slate-900/60 border-t border-white/5">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type message..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl pl-4 sm:pl-6 pr-24 sm:pr-32 py-3 sm:py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-muted-foreground/30"
                                    />
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            type="button"
                                            className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 transition-all rounded-lg sm:rounded-xl"
                                        >
                                            <Upload size={18} sm:size={20} />
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className={`p-2 rounded-lg sm:rounded-xl transition-all ${newMessage.trim() && !sending
                                                ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20'
                                                : 'bg-white/5 text-muted-foreground cursor-not-allowed'
                                                }`}
                                        >
                                            {sending ? <span className="animate-spin block w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full"></span> : <Send size={18} sm:size={20} />}
                                        </button>
                                    </div>
                                </form>
                                <p className="text-[8px] sm:text-[9px] text-center text-muted-foreground/30 font-bold uppercase tracking-[0.2em] mt-3 sm:mt-4">
                                    AES-256 Secure Channel
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
