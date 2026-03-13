import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
    LogOut, FileText, Upload, Bell, Download, 
    ShieldCheck, MessageSquare, ExternalLink, Clock,
    ChevronRight, Briefcase, Activity, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/common/ToastService';

export default function ClientDashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) navigate('/internal/login'); 
            setSession(session);
        });
    }, [navigate]);

    // 1. Fetch Client Profile
    const { data: profile } = useQuery({
        queryKey: ['client_profile', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase.from('client_profiles').select('*').eq('id', session.user.id).single();
            return data;
        }
    });

    // 2. Fetch Firm Info (Via Profile)
    const { data: firm } = useQuery({
        queryKey: ['client_firm', profile?.firm_id],
        enabled: !!profile?.firm_id,
        queryFn: async () => {
            const { data } = await supabase.from('firms').select('name').eq('id', profile.firm_id).single();
            return data;
        }
    });

    // 3. Fetch My Matters
    const { data: matters, isLoading: loadingMatters } = useQuery({
        queryKey: ['client_matters', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('matters')
                .select('*')
                .eq('client_id', session.user.id)
                .order('updated_at', { ascending: false });
            return data || [];
        }
    });

    // 4. Fetch Notifications
    const { data: notifications } = useQuery({
        queryKey: ['client_notifications', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            return data || [];
        }
    });

    // 5. Fetch Client Documents
    const { data: documents } = useQuery({
        queryKey: ['client_documents', session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('client_documents')
                .select('*')
                .eq('client_id', session.user.id)
                .order('uploaded_at', { ascending: false });
            return data || [];
        }
    });

    // Document Upload Mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!profile?.firm_id) throw new Error('No firm linked');

            const { error } = await supabase.from('client_documents').insert({
                firm_id: profile.firm_id,
                client_id: session.user.id,
                file_name: file.name,
                file_url: 'https://placeholder.url', // Placeholder for V1
                file_size: file.size
            });

            if (error) throw error;
        },
        onSuccess: () => {
            toast('Document submitted to your legal team', 'success');
            setUploading(false);
        }
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/internal/login');
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            {/* 1. Navigation Header */}
            <header className="bg-[#1E293B]/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-10 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center font-black text-white italic">
                            CB
                        </div>
                        <div>
                            <span className="font-black text-xl tracking-tighter uppercase italic">My <span className="text-indigo-400">Portal</span></span>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Institutional Client Access</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 relative group cursor-pointer">
                                <Bell className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                                {notifications && notifications.some(n => !n.read) && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1E293B]"></span>
                                )}
                            </div>
                            <div className="h-4 w-px bg-slate-700"></div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{firm?.name || 'Authorized Firm'}</p>
                                <p className="text-sm font-black text-white">{profile?.full_name || 'Legal Client'}</p>
                            </div>
                            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-10 py-16">
                
                {/* 2. Welcome & Stats Hub */}
                <div className="mb-16">
                    <div className="flex items-center gap-3 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 bg-indigo-500/10 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                        <ShieldCheck size={12} /> Secure Digital File Access
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter italic uppercase mb-8">
                        Session: <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Active</span>
                    </h1>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-[#1E293B] border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                <Briefcase className="w-20 h-20 text-indigo-400" />
                            </div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Matters</p>
                            <p className="text-4xl font-black text-white">{matters?.length || 0}</p>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                            </div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Pending Actions</p>
                            <p className="text-4xl font-black text-emerald-400">0</p>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Bell className="w-20 h-20 text-indigo-400" />
                            </div>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Legal Updates</p>
                            <p className="text-4xl font-black text-white">{notifications?.filter(n => !n.read).length || 0}</p>
                        </div>

                        <div className="bg-indigo-600 shadow-xl shadow-indigo-600/20 p-8 rounded-[2rem] relative overflow-hidden cursor-pointer group hover:bg-indigo-700 transition-all" onClick={() => setUploading(true)}>
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Upload className="w-16 h-16 text-white" />
                            </div>
                            <h3 className="text-lg font-black uppercase tracking-tight italic mb-1">Secure Upload</h3>
                            <p className="text-xs text-indigo-100 font-bold max-w-[120px]">Submit documents to your team</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* 3. Matter Portfolio */}
                    <div className="lg:col-span-2 space-y-12">
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                    <Activity size={16} className="text-indigo-400" /> Legal Matter Portfolio
                                </h2>
                                <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">Case History <ChevronRight size={10} className="inline ml-1"/></button>
                            </div>

                            <div className="space-y-6">
                                {loadingMatters ? (
                                    <div className="py-20 text-center animate-pulse text-slate-700 font-black uppercase tracking-[0.5em]">Syncing File...</div>
                                ) : matters?.length === 0 ? (
                                    <div className="bg-[#1E293B]/30 border border-white/5 border-dashed rounded-[2rem] p-20 text-center">
                                        <p className="text-slate-600 font-black uppercase tracking-widest">No active cases registered.</p>
                                    </div>
                                ) : (
                                    matters?.map((matter: any) => (
                                        <div key={matter.id} className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl hover:border-indigo-500/30 transition-all group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <h3 className="text-2xl font-black tracking-tight italic uppercase mb-2 group-hover:text-indigo-400 transition-colors">
                                                        {matter.title}
                                                    </h3>
                                                    <p className="text-slate-400 text-sm max-w-xl font-medium leading-relaxed">
                                                        {matter.description || 'Institutional case summary is currently being drafted by your legal team.'}
                                                    </p>
                                                </div>
                                                <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                    {matter.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                                                <button className="text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-indigo-400 transition-colors flex items-center gap-2">
                                                    <FileText size={14} className="text-indigo-400" /> View Detailed File
                                                </button>
                                                <div className="h-3 w-px bg-slate-700"></div>
                                                <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors flex items-center gap-2">
                                                    <MessageSquare size={14} /> Contact Counsel
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 4. Document Hub */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                            <h3 className="text-2xl font-black tracking-tighter italic uppercase mb-10 border-b border-white/5 pb-8 flex items-center gap-3">
                                Shared Assets <Download size={24} className="text-indigo-400" />
                            </h3>
                            <div className="space-y-6">
                                {documents && documents.length > 0 ? (
                                    documents.map((doc: any) => (
                                        <div key={doc.id} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all group">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{doc.file_name}</h4>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                                        {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="p-3 bg-white/5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase tracking-widest">Document Vault Empty</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 5. Sidbar: Activity Feed */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 rounded-[2rem] p-10 shadow-2xl">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-10 flex items-center justify-between italic">
                                System Activity <Clock size={16} />
                            </h3>
                            <div className="space-y-8 relative">
                                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-white/5"></div>
                                {notifications && notifications.length > 0 ? (
                                    notifications.slice(0, 6).map((notif: any) => (
                                        <div key={notif.id} className="relative pl-10 group cursor-default">
                                            <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-indigo-500 bg-[#1E293B] z-10 group-hover:bg-indigo-500 transition-colors" />
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 italic">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs font-bold text-white leading-relaxed group-hover:text-indigo-400 transition-colors">
                                                {notif.message}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-center text-slate-700 font-black uppercase tracking-widest py-10">All clear</p>
                                )}
                            </div>
                            <button className="w-full mt-10 p-4 border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:bg-white/5 transition-all">Load Full History</button>
                        </div>

                        {/* Quick Link Card */}
                        <div className="bg-gradient-to-tr from-cyan-600/20 to-indigo-600/20 border border-indigo-500/20 rounded-[2rem] p-10 relative overflow-hidden">
                            <h4 className="text-lg font-black uppercase tracking-tight italic mb-4">Direct Channel</h4>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">Need immediate assistance? Connect directly with your assigned Case Manager.</p>
                            <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                                Open Secure Chat <ExternalLink size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* 6. Upload Interface */}
            {uploading && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-8 backdrop-blur-md">
                    <div className="bg-[#1E293B] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full shadow-2xl relative">
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Secure Transfer</h3>
                        <p className="text-slate-400 text-sm font-medium mb-10 italic">Upload sensitive documents directly to our encrypted storage vaults.</p>
                        
                        <div className="border-2 border-dashed border-white/5 rounded-3xl p-16 text-center mb-10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                            <Upload className="w-16 h-16 text-slate-700 mx-auto mb-6 group-hover:text-indigo-500 transition-colors" />
                            <p className="text-white font-black uppercase tracking-widest text-sm">Select Institutional Data</p>
                            <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-2">Maximum 50MB per file</p>
                        </div>

                        <div className="flex justify-end gap-6">
                            <button onClick={() => setUploading(false)} className="px-8 py-3 font-black text-slate-500 uppercase tracking-widest text-xs hover:text-white transition-colors">Discard</button>
                            <button 
                                onClick={() => uploadMutation.mutate({ name: 'Financial_Records_2026.pdf', size: 2048576 } as File)}
                                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-600/20 transition-all"
                            >
                                Initiate Sync
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
