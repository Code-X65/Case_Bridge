import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ClientLayout from '../components/ClientLayout';
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

    useGSAP(() => {
        if (!loading) {
            gsap.from('.message-thread', {
                opacity: 0,
                x: 20,
                duration: 0.5,
                ease: 'power2.out'
            });
            gsap.from('.matter-list', {
                opacity: 0,
                x: -20,
                duration: 0.5,
                ease: 'power2.out'
            });
        }
    }, [loading]);

    if (loading) {
        return (
            <ClientLayout>
                <div className="flex justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                </div>
            </ClientLayout>
        );
    }

    return (
        <ClientLayout>
            <div className="h-[calc(100vh-160px)] flex gap-6 overflow-hidden">
                {/* Sidebar: Case Selector */}
                <div className="matter-list w-80 flex flex-col gap-4">
                    <div className="px-2">
                        <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Messages</h1>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Case Active Threads</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {matters.length === 0 ? (
                            <div className="glass-card p-6 text-center opacity-50">
                                <p className="text-xs italic">No active cases with messaging.</p>
                            </div>
                        ) : (
                            matters.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMatter(m)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all group ${selectedMatter?.id === m.id
                                        ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-lg shadow-blue-500/5'
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Briefcase size={14} className={selectedMatter?.id === m.id ? 'text-blue-400' : 'text-muted-foreground'} />
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{m.title}</span>
                                    </div>
                                    <h3 className={`font-bold text-sm truncate ${selectedMatter?.id === m.id ? 'text-white' : 'text-slate-400'}`}>
                                        {m.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[10px] opacity-50 font-bold">{new Date(m.created_at).toLocaleDateString()}</span>
                                        {selectedMatter?.id === m.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="message-thread flex-1 glass-card flex flex-col overflow-hidden relative border-none bg-slate-900/40">
                    {!selectedMatter ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                                <MessageSquare size={40} className="text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-black mb-2">Select a Case</h3>
                            <p className="text-muted-foreground max-w-xs text-sm">Choose an active case from the sidebar to view your secure message thread.</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-lg leading-tight">{selectedMatter.title}</h2>
                                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Secure Legal Channel</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link to={`/cases/${selectedMatter.case_report_id}`} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                                        View Case
                                    </Link>
                                    <button className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg">
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 italic text-sm">
                                        <p>Secure message encryption active.</p>
                                        <p>Send a message to start the conversation.</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isClient = msg.sender_role === 'client';
                                        return (
                                            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] ${isClient ? 'order-2' : ''}`}>
                                                    <div className={`flex items-baseline gap-2 mb-1 px-1 ${isClient ? 'flex-row-reverse' : ''}`}>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                            {isClient ? 'You' : msg.sender_role.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-[8px] opacity-30 font-bold">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${isClient
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
                            <div className="p-6 bg-slate-900/60 border-t border-white/5">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message securely..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-32 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-muted-foreground/30"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="p-2.5 text-muted-foreground hover:text-white hover:bg-white/5 transition-all rounded-xl"
                                        >
                                            <Upload size={20} />
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className={`p-2.5 rounded-xl transition-all ${newMessage.trim() && !sending
                                                ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20'
                                                : 'bg-white/5 text-muted-foreground cursor-not-allowed'
                                                }`}
                                        >
                                            {sending ? <span className="animate-spin block w-5 h-5 border-2 border-white/20 border-t-white rounded-full"></span> : <Send size={20} />}
                                        </button>
                                    </div>
                                </form>
                                <p className="text-[9px] text-center text-muted-foreground/30 font-bold uppercase tracking-[0.2em] mt-4">
                                    All communications are end-to-end encrypted and auditable.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </ClientLayout>
    );
}
