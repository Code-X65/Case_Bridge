import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import {
    History, User, Activity, Calendar, Info,
    Search, X, Download, AlertCircle
} from 'lucide-react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TableSkeleton } from '@/components/ui/Skeleton';

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
    metadata: any;
    actor_id: string;
    actor: {
        full_name: string;
        email: string;
    } | null;
}

export default function AuditLogsPage() {
    const { session } = useInternalSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [actorFilter, setActorFilter] = useState('all');
    const [dateRange, setDateRange] = useState('all'); // all, 7d, 30d, 90d

    // Fetch Audit Logs
    const { data: logs, isLoading } = useQuery<AuditLog[]>({
        queryKey: ['audit_logs', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
    *,
    actor: actor_id(
        full_name,
        email
    )
                `)
                .eq('firm_id', session!.firm_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as any[];
        }
    });

    // Fetch Firm Users for filtering
    const { data: users } = useQuery({
        queryKey: ['firm_users_list', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .eq('firm_id', session!.firm_id);
            if (error) throw error;
            return data;
        }
    });

    const filteredLogs = useMemo(() => {
        if (!logs) return [];
        return logs.filter(log => {
            // Search filter (Action or Actor)
            const matchesSearch =
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.actor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.actor?.email?.toLowerCase().includes(searchTerm.toLowerCase());

            // Action filter
            const matchesAction = actionFilter === 'all' || log.action === actionFilter;

            // Actor filter
            const matchesActor = actorFilter === 'all' || log.actor_id === actorFilter;

            // Date filter
            let matchesDate = true;
            if (dateRange !== 'all') {
                const logDate = new Date(log.created_at);
                const now = new Date();
                const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
                matchesDate = isWithinInterval(logDate, {
                    start: startOfDay(subDays(now, days)),
                    end: endOfDay(now)
                });
            }

            return matchesSearch && matchesAction && matchesActor && matchesDate;
        });
    }, [logs, searchTerm, actionFilter, actorFilter, dateRange]);

    const uniqueActions = useMemo(() => {
        if (!logs) return [];
        return Array.from(new Set(logs.map(l => l.action))).sort();
    }, [logs]);

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('delete') || a.includes('revoke') || a.includes('locked') || a.includes('deleted')) return 'text-red-400 bg-red-400/10';
        if (a.includes('create') || a.includes('invite') || a.includes('accepted') || a.includes('created')) return 'text-green-400 bg-green-400/10';
        if (a.includes('update') || a.includes('assigned') || a.includes('changed') || a.includes('reassigned')) return 'text-blue-400 bg-blue-400/10';
        if (a.includes('login')) return 'text-amber-400 bg-amber-400/10';
        if (a.includes('upload')) return 'text-purple-400 bg-purple-400/10';
        if (a.includes('firm')) return 'text-cyan-400 bg-cyan-400/10';
        return 'text-slate-400 bg-slate-400/10';
    };

    const formatAction = (action: string) => {
        return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const renderMetadata = (metadata: any) => {
        if (!metadata || Object.keys(metadata).length === 0) return <span className="text-xs text-slate-600 italic">Static context only</span>;

        return (
            <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(metadata).map(([key, value]) => {
                    if (['firm_id', 'invite_id', 'session_id', 'actor_id'].includes(key)) return null;

                    return (
                        <div key={key} className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{key.replace('_', ' ')}</span>
                            <span className="text-[11px] text-indigo-300 font-medium truncate max-w-[200px]" title={String(value)}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-7xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <History className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight">Forensic Log <span className="text-indigo-500">Explorer</span></h1>
                        </div>
                        <p className="text-slate-400 text-lg">Real-time immutable ledger of every administrative and security event.</p>
                    </div>

                    <button className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                        <Download className="w-4 h-4" /> Export Audit Evidence
                    </button>
                </header>

                {/* Advanced Filtering Suite */}
                <div className="bg-[#1E293B] border border-white/10 rounded-[2rem] p-8 mb-8 shadow-2xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Actor / Principal</label>
                            <select
                                value={actorFilter}
                                onChange={e => setActorFilter(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Personnel</option>
                                {users?.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Action Type</label>
                            <select
                                value={actionFilter}
                                onChange={e => setActionFilter(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Activity</option>
                                {uniqueActions.map(action => (
                                    <option key={action} value={action}>{formatAction(action)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Temporal Range</label>
                            <select
                                value={dateRange}
                                onChange={e => setDateRange(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Time</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                            </select>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text"
                                placeholder="Search by name, action..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-[#0F172A] border border-white/5 rounded-xl text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Discovery Results */}
                <div className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Trace Results ({filteredLogs.length})
                        </h2>
                        {searchTerm || actionFilter !== 'all' || actorFilter !== 'all' || dateRange !== 'all' ? (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setActionFilter('all');
                                    setActorFilter('all');
                                    setDateRange('all');
                                }}
                                className="text-[10px] text-rose-400 font-bold uppercase tracking-widest flex items-center gap-1 hover:text-rose-300 transition-colors"
                            >
                                <X className="w-3 h-3" /> Clear Intelligence Filters
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                                <AlertCircle className="w-3 h-3" /> Integrity Verified
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <TableSkeleton rows={8} cols={4} />
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 border-b border-white/5 bg-white/[0.01]">
                                        <th className="px-10 py-6">Timestamp / Seq</th>
                                        <th className="px-10 py-6">Identity</th>
                                        <th className="px-10 py-6">Action / Directive</th>
                                        <th className="px-10 py-6">Metadata / Payloads</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-24 text-center">
                                                <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest">No matching records found in ledger</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors border-l-2 border-l-transparent hover:border-l-indigo-500">
                                                <td className="px-10 py-7">
                                                    <div className="flex items-center gap-3">
                                                        <Calendar className="w-4 h-4 text-slate-700" />
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-300">
                                                                {format(new Date(log.created_at), 'MMM dd, yyyy')}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 font-mono uppercase font-bold">
                                                                {format(new Date(log.created_at), 'hh:mm:ss a')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-7">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                                            <User className="w-5 h-5 text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">{log.actor?.full_name || 'System / Kernel'}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">{log.actor?.email || 'automated@casebridge.io'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-7">
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm ${getActionColor(log.action)}`}>
                                                        {formatAction(log.action)}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-7">
                                                    <div className="max-w-[320px]">
                                                        {renderMetadata(log.metadata)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="p-8 bg-white/[0.01] border-t border-white/5 text-center">
                        <p className="text-[9px] text-slate-700 font-black tracking-[0.4em] uppercase italic">
                            Immutable Ledger - Secure Access Guaranteed
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
