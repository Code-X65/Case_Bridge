
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, Search, ExternalLink, Shield } from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function MyManagedMatters() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    // Fetch Matters where I am the Case Manager
    const { data: matters, isLoading } = useQuery({
        queryKey: ['managed_matters', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matters')
                .select(`
                    id,
                    title,
                    description,
                    lifecycle_state,
                    created_at,
                    matter_number,
                    assignee:assigned_associate ( id, full_name, email ),
                    client:client_id ( first_name, last_name, email )
                `)
                .eq('assigned_case_manager', session!.user_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4">
                            <Shield size={12} /> Administrative Oversight
                        </div>
                        <h2 className="text-4xl font-black tracking-tight mb-2 italic">Managed <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-black">Cases</span></h2>
                        <p className="text-slate-400 font-medium">Monitoring and supervising active matters under your management.</p>
                    </div>
                </header>

                {/* Filters & Search Row */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter managed cases..."
                            className="w-full bg-[#1E293B] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-xl"
                        />
                    </div>
                </div>

                {/* Matters List View */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Scanning management registry...</p>
                        </div>
                    ) : matters?.length === 0 ? (
                        <div className="bg-[#1E293B] border border-white/5 border-dashed rounded-3xl p-20 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <Briefcase className="w-10 h-10 text-slate-600" />
                            </div>
                            <h4 className="font-black text-xl text-slate-400 mb-2">No cases under management.</h4>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">You are not currently assigned as the head case manager for any active matters.</p>
                        </div>
                    ) : (
                        matters?.map((matter: any) => (
                            <div key={matter.id} className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 hover:border-indigo-500/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>

                                <div className="flex-1 min-w-0 relative">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${matter.lifecycle_state === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            matter.lifecycle_state === 'closed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                            }`}>
                                            {matter.lifecycle_state?.replace('_', ' ')}
                                        </span>
                                        {matter.matter_number && (
                                            <span className="text-[10px] font-mono text-slate-500">{matter.matter_number}</span>
                                        )}
                                    </div>
                                    <h3 className="text-2xl font-black text-white hover:text-indigo-400 transition-colors cursor-pointer mb-2 truncate">
                                        {matter.title}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Assigned Associate</span>
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">
                                                    {matter.assignee?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <span className="text-xs font-bold text-slate-300">{matter.assignee?.full_name || 'Unassigned'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Client Reference</span>
                                            <span className="text-xs font-bold text-slate-400">{matter.client?.first_name} {matter.client?.last_name}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                    <button
                                        onClick={() => navigate(`/internal/matter/${matter.id}`)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold text-xs transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Review Workspace
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
