import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { 
    ShieldCheck, Users, ChevronRight, CheckCircle2, Circle, 
    Activity, Briefcase, Clock, Zap, Settings, CreditCard, 
    FileText, LayoutDashboard, Database, AlertCircle
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function AdminDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    // 1. Fetch Admin Profile
    const { data: profile } = useQuery({
        queryKey: ['admin_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('*').eq('id', session!.user_id).single();
            return data;
        }
    });

    // 2. Fetch Firm Details
    const { data: firm } = useQuery({
        queryKey: ['firm_details', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase.from('firms').select('*').eq('id', session!.firm_id).single();
            return data;
        }
    });

    // 3. Integrated Admin Stats
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin_firm_stats', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const firmId = session!.firm_id;
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            // Staff Count
            const { count: staffCount } = await supabase
                .from('user_firm_roles')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', firmId);

            // Total Matters
            const { count: mattersCount } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', firmId);

            // Pending Approvals (Matter Updates)
            const { count: pendingApprovals } = await supabase
                .from('matter_updates')
                .select('id, matter!inner(firm_id)', { count: 'exact', head: true })
                .eq('matter.firm_id', firmId)
                .eq('status', 'under_review');

            // Audit Logs (Top 5)
            const { data: auditLogs } = await supabase
                .from('audit_logs')
                .select('*, actor:actor_id(full_name)')
                .eq('firm_id', firmId)
                .order('created_at', { ascending: false })
                .limit(5);

            // Active Users Proxy (Unique actors in last 24h)
            const { data: recentActors } = await supabase
                .from('audit_logs')
                .select('actor_id')
                .eq('firm_id', firmId)
                .gte('created_at', yesterday.toISOString());
            
            const activeUsersCount = new Set((recentActors || []).map(a => a.actor_id)).size;

            return {
                staffCount: staffCount || 0,
                mattersCount: mattersCount || 0,
                pendingApprovals: pendingApprovals || 0,
                activeUsersCount: activeUsersCount || 0,
                auditLogs: (auditLogs as any[]) || []
            };
        }
    });

    if (isLoading) {
        return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-indigo-500 font-black uppercase tracking-[0.4em] animate-pulse">Initializing Governance Engine...</div>;
    }

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl">
                {/* 1. Welcome Header */}
                <header className="mb-12">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px] mb-4 bg-indigo-500/10 w-fit px-3 py-1 rounded-full border border-indigo-500/20">
                        <Database size={12} /> System Administrator Portal
                    </div>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-indigo-400 text-sm font-black uppercase tracking-widest mb-2 italic">Welcome back, {profile?.full_name || 'Administrator'}</p>
                            <h1 className="text-5xl font-black tracking-tighter mb-4 italic uppercase">
                                <span className="text-slate-500">Firm</span> <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 font-black">Control</span>
                            </h1>
                            <p className="text-slate-400 text-lg max-w-2xl leading-relaxed font-medium">
                                Authority Console for <strong className="text-white font-black">{firm?.name}</strong>. System status is nominal.
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Firm ID</p>
                            <p className="text-xs font-mono text-indigo-400/50 bg-indigo-500/5 px-3 py-1 rounded-lg border border-indigo-500/10">{session?.firm_id}</p>
                        </div>
                    </div>
                </header>

                {/* 2. Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-indigo-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Activity className="w-20 h-20 text-indigo-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Active Users</p>
                        <p className="text-4xl font-black text-white">{stats?.activeUsersCount || 0}</p>
                        <p className="text-[10px] text-indigo-500 font-bold mt-4 uppercase">Last 24h Activity</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-cyan-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Briefcase className="w-20 h-20 text-cyan-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Matters</p>
                        <p className="text-4xl font-black text-white">{stats?.mattersCount || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase italic">Firm Lifecycle</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-yellow-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Clock className="w-20 h-20 text-yellow-500" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Pending Gateways</p>
                        <p className="text-4xl font-black text-yellow-500">{stats?.pendingApprovals || 0}</p>
                        <p className="text-[10px] text-yellow-500/50 font-bold mt-4 uppercase">Admin Approval Required</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/40 group hover:border-emerald-500/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Users className="w-20 h-20 text-emerald-400" />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Staff Density</p>
                        <p className="text-4xl font-black text-white">{stats?.staffCount || 0}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-4 uppercase underline">Resident Team</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2 space-y-12">
                        {/* 3. Global Actions Hub */}
                        <div>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 italic">
                                <Zap size={16} className="text-indigo-400" /> Administrative Nexus
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div onClick={() => navigate('/internal/staff-management')} className="bg-[#1E293B] border border-white/5 p-8 rounded-3xl group hover:border-indigo-500/50 cursor-pointer transition-all shadow-xl hover:bg-[#1E293B]/80 text-center">
                                    <Users className="w-8 h-8 text-indigo-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Staff Management</h4>
                                </div>
                                <div onClick={() => navigate('/internal/firm-profile')} className="bg-[#1E293B] border border-white/5 p-8 rounded-3xl group hover:border-cyan-500/50 cursor-pointer transition-all shadow-xl hover:bg-[#1E293B]/80 text-center">
                                    <Settings className="w-8 h-8 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Firm Profile</h4>
                                </div>
                                <div onClick={() => navigate('/internal/billing')} className="bg-[#1E293B] border border-white/5 p-8 rounded-3xl group hover:border-emerald-500/50 cursor-pointer transition-all shadow-xl hover:bg-[#1E293B]/80 text-center">
                                    <CreditCard className="w-8 h-8 text-emerald-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em]">Billing & Subs</h4>
                                </div>
                            </div>
                        </div>

                        {/* 4. Getting Started Checklist */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    Firm Setup Protocol <LayoutDashboard size={20} className="text-indigo-400" />
                                </h3>
                                <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-[0.2em]">
                                    { (stats?.staffCount||0) > 1 && (firm?.website || firm?.logo_url) ? '75% Complete' : '25% Complete' }
                                </span>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all">
                                    <div className="mt-1">
                                        {(stats?.staffCount || 0) > 1 ? (
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                        ) : (
                                            <Circle className="w-8 h-8 text-slate-700 hover:text-indigo-500 transition-colors cursor-pointer" onClick={() => navigate('/internal/staff-management')} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight italic">Initiate Staff Recruitment</h4>
                                        <p className="text-sm text-slate-400 mb-4 font-medium">Invite your core Case Managers and Associate Counsel to the firm.</p>
                                        {(stats?.staffCount || 0) <= 1 && (
                                            <button onClick={() => navigate('/internal/staff-management')} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-2">Execute Order <ChevronRight size={12} /></button>
                                        )}
                                    </div>
                                </div>

                                <div className={`flex items-start gap-6 p-6 rounded-3xl border transition-all ${firm?.website || firm?.logo_url ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                    <div className="mt-1">
                                        {(firm?.website || firm?.logo_url) ? (
                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                        ) : (
                                            <Circle className="w-8 h-8 text-slate-700 hover:text-cyan-500 transition-colors cursor-pointer" onClick={() => navigate('/internal/firm-profile')} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight italic">Define Firm Identity</h4>
                                        <p className="text-sm text-slate-400 mb-4 font-medium">Upload institutional branding and establish digital office parameters.</p>
                                        {!(firm?.website || firm?.logo_url) && (
                                            <button onClick={() => navigate('/internal/firm-profile')} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 flex items-center gap-2">Configure Identity <ChevronRight size={12} /></button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 grayscale opacity-50">
                                    <div className="mt-1">
                                        <ShieldCheck className="w-8 h-8 text-slate-700" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white mb-1 uppercase tracking-tight italic">Security Hardening</h4>
                                        <p className="text-sm text-slate-500 mb-2 font-medium">Activate Two-Factor Authentication and customize session timeouts.</p>
                                        <span className="text-[8px] font-black uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-500">Coming Soon</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* 5. System Health Card */}
                        <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <ShieldCheck className="w-24 h-24 text-emerald-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Security: Nominal</span>
                                </div>

                                <h3 className="text-3xl font-black mb-1 uppercase tracking-tighter">{firm?.name}</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Enterprise Tier</p>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <AlertCircle size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Health</span>
                                        </div>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Stable</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3 text-slate-400">
                                            <Zap size={16} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Uptime</span>
                                        </div>
                                        <span className="text-xs font-black text-white">99.98%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 6. Recent Audit Logs */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center justify-between">
                                System Audit Trail <FileText size={14} />
                            </h3>
                            <div className="space-y-6">
                                {stats?.auditLogs && stats.auditLogs.length > 0 ? (
                                    stats.auditLogs.map((log: any) => (
                                        <div key={log.id} className="relative pl-6 border-l border-white/5 pb-2">
                                            <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{log.action?.replace('_', ' ')}</p>
                                            <h4 className="text-[11px] font-bold text-white mb-1 truncate">{log.actor?.full_name || 'System'}</h4>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.created_at).toLocaleDateString()}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest text-center py-10 opacity-50">Audit log empty</p>
                                )}
                            </div>
                            <button className="w-full mt-8 py-4 border border-white/5 hover:bg-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white rounded-2xl transition-all">Export Mastery Logs</button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center py-10 border-t border-white/5">
                    <p className="text-[10px] text-slate-800 font-black uppercase tracking-[0.5em]">
                        Administrative Authority Console — Unified Release v1.2.0
                    </p>
                </footer>
            </main>
        </div>
    );
}
