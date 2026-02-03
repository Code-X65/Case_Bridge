import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Users,
    ArrowUpRight,
    Search,
    Filter,
    Download
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRef, useState } from 'react';

export default function ReportingDashboard() {
    const { session } = useInternalSession();
    const containerRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch High-Level Firm Stats via RPC
    const { data: globalStats, isLoading: statsLoading } = useQuery({
        queryKey: ['firm_reporting_stats', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_firm_reporting_stats', {
                p_firm_id: session!.firm_id
            });
            if (error) throw error;
            return data;
        }
    });

    // 2. Fetch Staff Performance Metrics
    const { data: staffPerformance, isLoading: staffLoading } = useQuery({
        queryKey: ['staff_performance', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('staff_performance_report')
                .select('*')
                .eq('firm_id', session!.firm_id);
            if (error) throw error;
            return data;
        }
    });

    useGSAP(() => {
        if (!statsLoading && !staffLoading) {
            gsap.from('.stat-card', {
                opacity: 0,
                y: 20,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power3.out'
            });
            gsap.from('.report-row', {
                opacity: 0,
                x: -10,
                duration: 0.5,
                stagger: 0.05,
                delay: 0.3,
                ease: 'power2.out'
            });
        }
    }, [statsLoading, staffLoading]);

    const filteredStaff = staffPerformance?.filter(s =>
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex overflow-hidden">
            <InternalSidebar />

            <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto">
                <div ref={containerRef} className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Analytics Engine v2.0</span>
                            </div>
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                                Firm <span className="text-indigo-500">SLA & Performance</span>
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">Real-time resolution metrics and staff workload orchestration.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="px-5 py-2.5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Download size={14} /> Export CSV
                            </button>
                            <button className="px-5 py-2.5 bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                Refresh Data
                            </button>
                        </div>
                    </div>

                    {/* High Level Metrics Table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <StatCard
                            label="Avg. Response"
                            value={`${globalStats?.avg_response_hours.toFixed(1)}h`}
                            sub="Time to assignment"
                            icon={Clock}
                            color="blue"
                            trend="+2.4%"
                        />
                        <StatCard
                            label="Resolution Speed"
                            value={`${globalStats?.avg_resolution_days.toFixed(1)}d`}
                            sub="Avg. time to close"
                            icon={TrendingUp}
                            color="indigo"
                            trend="-15%"
                        />
                        <StatCard
                            label="Closing Rate"
                            value={`${Math.round(globalStats?.closing_rate * 100)}%`}
                            sub="Matter success ratio"
                            icon={CheckCircle2}
                            color="emerald"
                        />
                        <StatCard
                            label="Active Matters"
                            value={globalStats?.active_matters}
                            sub={`${globalStats?.pending_review} in review`}
                            icon={AlertCircle}
                            color="orange"
                        />
                    </div>

                    {/* Staff Workload Leaderboard */}
                    <div className="bg-[#1E293B]/30 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-md">
                        <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-xl font-bold mb-1 flex items-center gap-3">
                                    Staff Orchestration
                                    <span className="text-[10px] font-black uppercase bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">Active Capacity</span>
                                </h3>
                                <p className="text-sm text-slate-500">Tracking legal efficiency across all assigned associate lawyers.</p>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search staff members..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-black/20 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64 transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/[0.02]">
                                        <th className="px-8 py-5">Associate Identity</th>
                                        <th className="px-8 py-5">Active Workload</th>
                                        <th className="px-8 py-5">Historical Close</th>
                                        <th className="px-8 py-5">SLA Speed</th>
                                        <th className="px-8 py-5 text-right">Performance Rank</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff?.map((staff, idx) => (
                                        <tr key={staff.staff_id} className="report-row border-t border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xs">
                                                        {staff.full_name?.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight">{staff.full_name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase font-black">{staff.role.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 max-w-[100px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 rounded-full"
                                                            style={{ width: `${Math.min(staff.active_matters * 10, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold">{staff.active_matters} Cases</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/20">
                                                    {staff.closed_matters} Resolved
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-slate-500" />
                                                    <span className="text-sm font-bold text-slate-200">
                                                        {staff.avg_resolution_days ? `${staff.avg_resolution_days.toFixed(1)}d` : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="inline-flex items-center gap-2 text-indigo-400 font-black text-xs uppercase italic group-hover:translate-x-1 transition-transform cursor-pointer">
                                                    View Analytics <ArrowUpRight size={14} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, sub, icon: Icon, color, trend }: any) {
    const colorMap: any = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };

    return (
        <div className="stat-card bg-[#1E293B]/40 border border-white/5 p-8 rounded-[2rem] hover:border-white/20 transition-all group relative overflow-hidden backdrop-blur-sm shadow-2xl">
            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 ${colorMap[color]}`}>
                    <Icon size={24} />
                </div>
                <div className="flex items-end justify-between mb-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">{label}</p>
                    {trend && (
                        <span className={`text-[10px] font-black flex items-center gap-0.5 ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trend} <TrendingUp size={10} className={trend.startsWith('-') ? 'rotate-180' : ''} />
                        </span>
                    )}
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter mb-2">{value ?? '...'}</h2>
                <p className="text-xs font-medium text-slate-500">{sub}</p>
            </div>
            {/* Visual Flair */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-indigo-500/5 transition-all"></div>
        </div>
    );
}
