
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Briefcase, CheckCircle2, AlertCircle, ArrowRight, Activity, Clock, Bell
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
        queryKey: ['associate_workload_extended', session?.firm_id, session?.user_id],
        enabled: !!session?.firm_id && !!session?.user_id,
        queryFn: async () => {
            const userId = session!.user_id;
            const firmId = session!.firm_id;
            const seventyTwoHoursAgo = new Date();
            seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() + 72);

            // 1. Active matters assigned to me
            const { count: assignedMatters } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', firmId)
                .eq('assigned_associate', userId)
                .neq('lifecycle_state', 'closed');

            // 2. Open tasks assigned to me
            const { count: openTasks } = await supabase
                .from('matter_tasks')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', userId)
                .in('status', ['pending', 'in_progress']);

            // 3. Critical Gates (Deadlines in next 72h)
            const { count: dueSoon } = await supabase
                .from('matter_tasks')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', userId)
                .in('status', ['pending', 'in_progress'])
                .lte('due_date', seventyTwoHoursAgo.toISOString())
                .gte('due_date', new Date().toISOString());

            // 4. Recent Activity (Matter updates in notifications)
            const { count: recentActivity } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            // 5. List of matters for the list view
            const { data: recentMattersList } = await supabase
                .from('matters')
                .select('id, title, lifecycle_state, updated_at')
                .eq('assigned_associate', userId)
                .order('updated_at', { ascending: false })
                .limit(5);

            // 6. Today's Schedule
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const { data: schedule } = await supabase
                .from('calendar_events')
                .select(`
                    id, title, start_time, event_type,
                    calendar_participants!inner(user_id)
                `)
                .eq('calendar_participants.user_id', userId)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .order('start_time', { ascending: true });

            // 7. Recent Case Alerts (Top 3 matters-related notifications)
            const { data: alerts } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(4);

            return {
                assignedMatters: assignedMatters || 0,
                openTasks: openTasks || 0,
                dueSoon: dueSoon || 0,
                recentActivity: recentActivity || 0,
                recentMattersList: (recentMattersList as any[]) || [],
                schedule: (schedule as any[]) || [],
                alerts: (alerts as any[]) || []
            };
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl">
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
                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Briefcase className="w-20 h-20 text-indigo-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Clusters</p>
                        <p className="text-4xl font-black text-white">{stats?.assignedMatters || 0}</p>
                        <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[60%] shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        </div>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <CheckCircle2 className="w-20 h-20 text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Task Pipeline</p>
                        <p className="text-4xl font-black text-emerald-400">{stats?.openTasks || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 italic">Action required</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <AlertCircle className="w-20 h-20 text-yellow-500" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Critical Gates</p>
                        <p className="text-4xl font-black text-yellow-500">{stats?.dueSoon || 0}</p>
                        <p className="text-[10px] text-yellow-500/50 font-bold mt-4 uppercase tracking-tighter">72h Window</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-20 h-20 text-blue-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Activity Log</p>
                        <p className="text-4xl font-black text-blue-400">{stats?.recentActivity || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase tracking-tighter">Last 7 Days</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-10">
                        {/* 3. Action Hub */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 border border-white/10 rounded-3xl group relative overflow-hidden hover:border-indigo-500/40 transition-all shadow-xl">
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/20 shadow-lg">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black mb-2 tracking-tight">Matter Workspace</h3>
                                <p className="text-slate-400 leading-relaxed mb-6 text-xs font-medium">
                                    Access case dossiers and filing tools.
                                </p>
                                <button
                                    onClick={() => navigate('/internal/associate/matters')}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    Open Cases <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-8 border border-white/10 rounded-3xl group relative overflow-hidden hover:border-emerald-500/40 transition-all shadow-xl">
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6 border border-emerald-500/20 shadow-lg">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black mb-2 tracking-tight">Task Pipeline</h3>
                                <p className="text-slate-400 leading-relaxed mb-6 text-xs font-medium">
                                    View daily administrative directives.
                                </p>
                                <button
                                    onClick={() => navigate('/internal/associate/tasks')}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
                                >
                                    View Board <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Recent Matters List */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={16} className="text-indigo-400" /> Recent Assigned Matters
                                </h2>
                                <button onClick={() => navigate('/internal/associate/matters')} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">View All</button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {stats?.recentMattersList && stats.recentMattersList.length > 0 ? (
                                    stats.recentMattersList.map((m: any) => (
                                        <div key={m.id} onClick={() => navigate(`/internal/matters/${m.id}`)} className="bg-[#1E293B] border border-white/5 hover:border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all group hover:bg-[#1E293B]/80 shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
                                                    <Briefcase size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors">{m.title}</h4>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-black mt-0.5">Updated {new Date(m.updated_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${m.lifecycle_state === 'active' || m.lifecycle_state === 'in_progress' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                m.lifecycle_state === 'pending_review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {m.lifecycle_state?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 border-2 border-dashed border-white/5 rounded-3xl text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                                        No active case assignments
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* 5. Today's Schedule */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                Today's Schedule <Clock size={14} />
                            </h3>
                            <div className="space-y-4">
                                {stats?.schedule && stats.schedule.length > 0 ? (
                                    stats.schedule.map((event: any) => (
                                        <div key={event.id} className="flex gap-4 group">
                                            <div className="text-right min-w-[50px]">
                                                <p className="text-[10px] font-black text-white">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[8px] font-bold text-slate-500 uppercase">AM</p>
                                            </div>
                                            <div className="flex-1 pb-4 border-l-2 border-indigo-500/20 pl-4 relative group-hover:border-indigo-500 transition-colors">
                                                <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[#1E293B]"></div>
                                                <h4 className="text-xs font-bold text-white mb-1">{event.title}</h4>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{event.event_type}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">No hearings or meetings</p>
                                    </div>
                                )}
                            </div>
                            <button onClick={() => navigate('/internal/calendar')} className="w-full mt-4 py-3 border border-white/5 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white rounded-xl transition-all">Open Calendar</button>
                        </div>

                        {/* 6. Case Alerts */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-3xl p-8 shadow-2xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                                Case Updates <Bell size={14} />
                            </h3>
                            <div className="space-y-4">
                                {stats?.alerts && stats.alerts.length > 0 ? (
                                    stats.alerts.map((alert: any) => (
                                        <div key={alert.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/20 transition-all cursor-pointer">
                                            <h4 className="text-[10px] font-bold text-white mb-1 truncate">{alert.payload.title}</h4>
                                            <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed">{alert.payload.message}</p>
                                            <p className="text-[8px] text-slate-600 font-bold mt-2 uppercase">{new Date(alert.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-[10px] text-slate-600 font-black uppercase tracking-widest py-4">All clear</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center py-10 border-t border-white/5">
                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">
                        CaseBridge Internal Authority Console — v1.0.5
                    </p>
                </footer>
            </main>
        </div>
    );
}

