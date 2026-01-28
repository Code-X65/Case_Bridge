
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Briefcase, CheckCircle2, AlertCircle, ArrowRight, Activity, Clock
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function AssociateDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    // Fetch Profile
    const { data: profile } = useQuery({
        queryKey: ['associate_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', session!.user_id).single();
            return data;
        }
    });

    // Fetch Workload Summary
    const { data: stats } = useQuery({
        queryKey: ['associate_workload', session?.firm_id, session?.user_id],
        enabled: !!session?.firm_id && !!session?.user_id,
        queryFn: async () => {
            // Count matters assigned to this associate
            const { count: assignedMatters } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', session!.firm_id)
                .eq('assigned_associate', session!.user_id);

            // Count recent reports/updates for these matters (to simulate "activity")
            const { data: recentReports } = await supabase
                .from('matter_updates')
                .select('id')
                .in('matter_id', (
                    await supabase
                        .from('matters')
                        .select('id')
                        .eq('assigned_associate', session!.user_id)
                ).data?.map(m => m.id) || [])
                .limit(5);

            // Fetch actual list for display
            const { data: recentMattersList } = await supabase
                .from('matters')
                .select('id, title, lifecycle_state, updated_at')
                .eq('firm_id', session!.firm_id) // Optionally redundant if RLS handles it, but good for safety
                .eq('assigned_associate', session!.user_id)
                .order('updated_at', { ascending: false })
                .limit(5);

            return {
                assignedMatters: assignedMatters || 0,
                recentActivity: recentReports?.length || 0,
                openTasks: 5, // Placeholder
                dueSoon: 1,    // Placeholder
                recentMattersList: recentMattersList || []
            };
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-6xl">
                {/* 1. Welcome Header */}
                <header className="mb-12">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 bg-indigo-500/10 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                        <Activity size={12} /> Live Associate Portal
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4">
                        Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{profile?.full_name?.split(' ')[0] || 'Associate'}</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
                        You are currently managing <strong className="text-white">{stats?.assignedMatters || 0} active matters</strong>. Here is your current workload and priority focus.
                    </p>
                </header>

                {/* 2. Workload Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Briefcase className="w-20 h-20 text-indigo-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Clusters</p>
                        <p className="text-4xl font-black text-white">{stats?.assignedMatters || 0}</p>
                        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[60%] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        </div>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Task Pipeline</p>
                        <p className="text-4xl font-black text-emerald-400">{stats?.openTasks || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 italic">Action required</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <AlertCircle className="w-20 h-20 text-yellow-500" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Critical Gates</p>
                        <p className="text-4xl font-black text-yellow-500">{stats?.dueSoon || 0}</p>
                        <p className="text-[10px] text-yellow-500/50 font-bold mt-4 uppercase tracking-tighter">72h Window</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Clock className="w-20 h-20 text-blue-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Activity Log</p>
                        <p className="text-4xl font-black text-blue-400">{stats?.recentActivity || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase tracking-tighter">Last 7 Days</p>
                    </div>
                </div>

                {/* 3. Action Hub */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="glass-card p-10 border border-white/10 rounded-3xl hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                            <Briefcase className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black mb-3">Matter Workspace</h3>
                        <p className="text-slate-400 leading-relaxed mb-8 text-sm">
                            Access full case dossiers, evidence review, and progress reporting tools for all cases explicitly assigned to your custody.
                        </p>
                        <button
                            onClick={() => navigate('/internal/associate/matters')}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            Open Assigned Matters <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="glass-card p-10 border border-white/10 rounded-3xl hover:border-emerald-500/50 transition-all group relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-8 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                            <Activity className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black mb-3">Governance & Tasks</h3>
                        <p className="text-slate-400 leading-relaxed mb-8 text-sm">
                            Review administrative requirements, filing deadlines, and internal task board directives from your Case Manager.
                        </p>
                        <button
                            onClick={() => navigate('/internal/associate/tasks')}
                            className="w-full py-4 border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase italic tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            View Task Board <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* 4. Recent Matters List */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Briefcase size={20} className="text-indigo-400" /> Recent Assigned Matters
                        </h2>
                        <button onClick={() => navigate('/internal/associate/matters')} className="text-sm font-bold text-slate-500 hover:text-white transition-colors">View All</button>
                    </div>

                    {stats?.recentMattersList && stats.recentMattersList.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {stats.recentMattersList.map((m: any) => (
                                <div key={m.id} onClick={() => navigate(`/internal/matter/${m.id}`)} className="bg-[#1E293B] border border-white/5 hover:border-indigo-500/30 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all group hover:bg-[#1E293B]/80">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                            <Briefcase size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-indigo-200 transition-colors">{m.title}</h4>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Updated {new Date(m.updated_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${m.lifecycle_state === 'in_progress' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        m.lifecycle_state === 'submitted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                        {m.lifecycle_state.replace('_', ' ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 border border-white/5 border-dashed rounded-2xl text-center text-slate-500 text-sm">
                            No assigned matters found.
                        </div>
                    )}
                </div>

                {/* 4. Support Footer */}
                <footer className="text-center py-6 border-t border-white/5">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
                        CaseBridge Internal Authority Console — v1.0.4
                    </p>
                </footer>
            </main>
        </div>
    );
}
