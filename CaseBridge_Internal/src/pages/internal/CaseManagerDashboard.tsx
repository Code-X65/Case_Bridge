import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    Briefcase, Activity, CalendarClock, Plus,
    ArrowRight, Clock, Users, AlertCircle, ChevronRight
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function CaseManagerDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    const { data: profile } = useQuery({
        queryKey: ['case_manager_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', session!.user_id).single();
            return data;
        }
    });

    // Integrated Workload & Stats
    const { data: stats, isLoading } = useQuery({
        queryKey: ['cm_workload_omni', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const firmId = session!.firm_id;
            const now = new Date().toISOString();
            const seventyTwoHoursAgo = new Date();
            seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() + 72);
            const future = seventyTwoHoursAgo.toISOString();

            // 1. Firm-wide Active Matters
            const { count: activeMatters } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', firmId)
                .neq('lifecycle_state', 'closed');

            // 2. Pending Reviews (Initial review or submission)
            const { count: pendingReviews } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', firmId)
                .in('lifecycle_state', ['submitted', 'pending_review']);

            // 3. Upcoming Deadlines (Firm-wide)
            const { count: upcomingDeadlines } = await supabase
                .from('matter_tasks')
                .select('id, matter!inner(firm_id)', { count: 'exact', head: true })
                .eq('matter.firm_id', firmId)
                .in('status', ['pending', 'in_progress'])
                .lte('due_date', future)
                .gte('due_date', now);

            // 4. Overdue Tasks
            const { data: overdueTasks } = await supabase
                .from('matter_tasks')
                .select('id, title, due_date, matter!inner(title, firm_id)')
                .eq('matter.firm_id', firmId)
                .in('status', ['pending', 'in_progress', 'under_review'])
                .lt('due_date', now)
                .order('due_date', { ascending: true })
                .limit(4);

            // 5. Team Workload (Associates counts)
            const { data: staff } = await supabase
                .from('profiles')
                .select('id, full_name, user_firm_roles!inner(role)')
                .eq('user_firm_roles.firm_id', firmId)
                .eq('user_firm_roles.role', 'associate_lawyer');

            const { data: matterAssignments } = await supabase
                .from('matters')
                .select('assigned_associate, id')
                .eq('firm_id', firmId)
                .neq('lifecycle_state', 'closed');

            const workload = (staff || []).map(s => ({
                id: s.id,
                name: s.full_name,
                count: (matterAssignments || []).filter(m => m.assigned_associate === s.id).length
            })).sort((a,b) => b.count - a.count);

            // 6. Recent Matter Overview
            const { data: recentMatters } = await supabase
                .from('matters')
                .select('id, title, lifecycle_state, updated_at, matter_number')
                .eq('firm_id', firmId)
                .order('updated_at', { ascending: false })
                .limit(5);

            return {
                activeMatters: activeMatters || 0,
                pendingReviews: pendingReviews || 0,
                upcomingDeadlines: upcomingDeadlines || 0,
                overdueTasks: (overdueTasks as any[]) || [],
                workload,
                recentMatters: (recentMatters as any[]) || []
            };
        }
    });

    if (isLoading) {
        return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-500 font-black uppercase tracking-[0.3em] animate-pulse">Synchronizing Command Console...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl">
                {/* 1. Welcome Header */}
                <header className="mb-12">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 bg-indigo-500/10 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                        <Activity size={12} /> Executive Oversight
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter mb-4">
                        Authority Console, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">{profile?.full_name?.split(' ')[0] || 'Manager'}</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl leading-relaxed font-light">
                        Overseeing <strong className="text-white font-black">{stats?.activeMatters} active dossiers</strong> across the firm hierarchy.
                    </p>
                </header>

                {/* 2. Workload Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-indigo-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Briefcase className="w-20 h-20 text-indigo-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Matters</p>
                        <p className="text-4xl font-black text-white">{stats?.activeMatters || 0}</p>
                        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[75%]"></div>
                        </div>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-yellow-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-20 h-20 text-yellow-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Pending Reviews</p>
                        <p className="text-4xl font-black text-yellow-500">{stats?.pendingReviews || 0}</p>
                        <p className="text-[10px] text-yellow-500/50 font-bold mt-4 uppercase">Awaiting Action</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-red-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CalendarClock className="w-20 h-20 text-red-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">72h Deadlines</p>
                        <p className="text-4xl font-black text-red-500">{stats?.upcomingDeadlines || 0}</p>
                        <p className="text-[10px] text-red-500/50 font-bold mt-4 uppercase">Critical Gateways</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-emerald-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Users className="w-20 h-20 text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Team Load</p>
                        <p className="text-4xl font-black text-emerald-400">{stats?.workload?.length || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase">Managed Staff</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-10">
                        {/* 3. Primary Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 border border-white/10 rounded-3xl group relative overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl">
                                <Plus className="w-8 h-8 text-indigo-400 mb-6" />
                                <h3 className="text-xl font-black mb-2 tracking-tight uppercase italic">Initiate <span className="text-indigo-400">Matter</span></h3>
                                <p className="text-slate-400 text-xs mb-8 leading-relaxed">Spawn a new legal docket and initialize intake protocol.</p>
                                <button
                                    onClick={() => navigate('/internal/case-manager/matters')}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    Open Intake Form <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 border border-white/10 rounded-3xl group relative overflow-hidden hover:border-yellow-500/50 transition-all shadow-xl">
                                <Clock className="w-8 h-8 text-yellow-500 mb-6" />
                                <h3 className="text-xl font-black mb-2 tracking-tight uppercase italic">Review <span className="text-yellow-500">Queue</span></h3>
                                <p className="text-slate-400 text-xs mb-8 leading-relaxed">Validate and authorize pending matter submissions.</p>
                                <button
                                    onClick={() => navigate('/internal/case-manager/matters')}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                                >
                                    Access Queue <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Recent Matters List */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                    <Briefcase size={16} className="text-indigo-400" /> Global Matter Ledger
                                </h2>
                                <button onClick={() => navigate('/internal/case-manager/matters')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">View All Firm Matters</button>
                            </div>

                            <div className="space-y-3">
                                {stats?.recentMatters && stats.recentMatters.length > 0 ? (
                                    stats.recentMatters.map((m: any) => (
                                        <div key={m.id} onClick={() => navigate(`/internal/matters/${m.id}`)} className="bg-[#1E293B] border border-white/5 hover:border-indigo-500/30 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all group hover:bg-[#1E293B]/80 shadow-md">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all shadow-inner">
                                                    <span className="text-[10px] font-black underline">{m.matter_number || 'MAT'}</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-white group-hover:text-indigo-200 transition-colors uppercase tracking-tight">{m.title}</h4>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-black mt-1">Sync {new Date(m.updated_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                m.lifecycle_state === 'active' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                m.lifecycle_state === 'pending_review' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                            }`}>
                                                {m.lifecycle_state?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-16 border-2 border-dashed border-white/5 rounded-3xl text-center text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">
                                        Firm registry empty
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Associate Workload Section */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Users size={40} className="text-indigo-400" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 border-b border-white/5 pb-4">
                                Team Capacity Matrix
                            </h3>
                            <div className="space-y-6">
                                {stats?.workload && stats.workload.length > 0 ? (
                                    stats.workload.map((staff: any) => (
                                        <div key={staff.id} className="group">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[11px] font-black text-white group-hover:text-indigo-400 transition-colors">{staff.name}</span>
                                                <span className="text-[10px] font-black text-slate-500 italic">{staff.count} CAS</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000" 
                                                    style={{ width: `${Math.min((staff.count / 10) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center py-4">No associates deployed</p>
                                )}
                            </div>
                        </div>

                        {/* Overdue Alerts */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-8 flex items-center justify-between">
                                Priority Breach <AlertCircle size={14} />
                            </h3>
                            <div className="space-y-4">
                                {stats?.overdueTasks && stats.overdueTasks.length > 0 ? (
                                    stats.overdueTasks.map((task: any) => (
                                        <div key={task.id} className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 hover:border-red-500/30 transition-all cursor-pointer group">
                                            <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">{task.matter.title}</p>
                                            <h4 className="text-xs font-black text-white mb-2 group-hover:text-red-200 transition-colors">{task.title}</h4>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-red-500/60 uppercase">Overdue {new Date(task.due_date).toLocaleDateString()}</span>
                                                <ChevronRight size={12} className="text-red-500/40" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                                        <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Operation Clean Slate</p>
                                        <p className="text-[8px] text-emerald-500/40 font-bold mt-1">Zero overdue objectives</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center py-10 border-t border-white/5">
                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
                        Executive Command Layer — Enterprise Edition v1.0.8
                    </p>
                </footer>
            </main>
        </div>
    );
}
