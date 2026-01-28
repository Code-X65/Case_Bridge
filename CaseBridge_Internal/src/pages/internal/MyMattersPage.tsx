
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, FileText, Search, Filter, ExternalLink, Shield } from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function MyMattersPage() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    // Fetch ONLY Assigned Matters
    const { data: matters, isLoading } = useQuery({
        queryKey: ['my_matters', session?.user_id],
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
                    assigned_associate,
                    client:client_id ( first_name, last_name, email )
                `)
                .eq('assigned_associate', session!.user_id)
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
                            <Shield size={12} /> Custody Management
                        </div>
                        <h2 className="text-4xl font-black tracking-tight mb-2 italic">My Assigned <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-black">Matters</span></h2>
                        <p className="text-slate-400 font-medium">Official record of cases under your professional supervision.</p>
                    </div>
                </header>

                {/* Filters & Search Row */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter your matters registry..."
                            className="w-full bg-[#1E293B] border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-xl"
                        />
                    </div>
                    <button className="px-5 py-3.5 bg-[#1E293B] border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-3 transition-all hover:bg-white/5 shadow-xl">
                        <Filter className="w-4 h-4" />
                        Status Filter
                    </button>
                </div>

                {/* Matters List View */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving dossiers...</p>
                        </div>
                    ) : matters?.length === 0 ? (
                        <div className="bg-[#1E293B] border border-white/5 border-dashed rounded-3xl p-20 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <Briefcase className="w-10 h-10 text-slate-600" />
                            </div>
                            <h4 className="font-black text-xl text-slate-400 mb-2">No active assignments found.</h4>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">Your case manager hasn't assigned any active matters to your profile yet.</p>
                        </div>
                    ) : (
                        matters?.map((matter: any) => (
                            <div key={matter.id} className="bg-[#1E293B] border border-white/5 rounded-3xl p-8 hover:border-indigo-500/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>

                                <div className="flex-1 min-w-0 relative">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${matter.lifecycle_state === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]' :
                                            matter.lifecycle_state === 'closed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                            }`}>
                                            {matter.lifecycle_state?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white hover:text-indigo-400 transition-colors cursor-pointer mb-2 truncate">
                                        {matter.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 line-clamp-1 italic max-w-2xl">
                                        "{matter.description || 'No description provided.'}"
                                    </p>
                                </div>

                                <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12 shrink-0">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Assigned Client</span>
                                        <span className="text-sm font-bold text-slate-200">
                                            {matter.client?.first_name} {matter.client?.last_name}
                                        </span>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Effective Date</span>
                                        <span className="text-sm font-bold text-slate-400">
                                            {new Date(matter.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/internal/matter/${matter.id}`)}
                                        className="bg-white/5 hover:bg-indigo-600 text-white p-4 rounded-2xl transition-all shadow-xl group/btn border border-white/5 hover:border-indigo-400"
                                    >
                                        <ExternalLink className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
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
