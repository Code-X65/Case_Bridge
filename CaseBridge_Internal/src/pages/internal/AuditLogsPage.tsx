import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { Loader2, History, User, Activity, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    action: string;
    created_at: string;
    metadata: any;
    actor: {
        full_name: string;
        email: string;
    } | null;
}

export default function AuditLogsPage() {
    const { session } = useInternalSession();

    const { data: logs, isLoading } = useQuery<AuditLog[]>({
        queryKey: ['audit_logs', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    actor:actor_id (
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

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('delete') || a.includes('revoke') || a.includes('locked') || a.includes('deleted')) return 'text-red-400 bg-red-400/10';
        if (a.includes('create') || a.includes('invite') || a.includes('accepted') || a.includes('created')) return 'text-green-400 bg-green-400/10';
        if (a.includes('update') || a.includes('assigned') || a.includes('changed') || a.includes('reassigned')) return 'text-blue-400 bg-blue-400/10';
        if (a.includes('login')) return 'text-amber-400 bg-amber-400/10';
        if (a.includes('upload')) return 'text-purple-400 bg-purple-400/10';
        if (a.includes('firm_profile')) return 'text-cyan-400 bg-cyan-400/10';
        return 'text-slate-400 bg-slate-400/10';
    };

    const formatAction = (action: string) => {
        return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const renderMetadata = (metadata: any) => {
        if (!metadata || Object.keys(metadata).length === 0) return <span className="text-xs text-slate-600 italic">No details</span>;

        // Custom renderers for specific actions to make them look premium
        return (
            <div className="space-y-1">
                {Object.entries(metadata).map(([key, value]) => {
                    // Skip internal fields
                    if (['firm_id', 'invite_id', 'session_id'].includes(key)) return null;

                    return (
                        <div key={key} className="flex items-center gap-2 group/meta">
                            <span className="text-[10px] text-slate-500 font-bold uppercase min-w-[70px]">{key.replace('_', ' ')}:</span>
                            <span className="text-[11px] text-indigo-300/80 font-medium truncate max-w-[180px]">
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

            <main className="ml-64 p-12 min-h-screen">
                <header className="mb-12">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                            <History className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight">Governance & Audit Logs</h1>
                    </div>
                    <p className="text-slate-400 text-lg">Detailed history of all administrative and security actions within your firm.</p>
                </header>

                <div className="bg-[#1E293B] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Activity Feed
                        </h2>
                        <div className="text-xs text-slate-500 font-mono">
                            Firm ID: {session?.firm_id}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5">
                                    <th className="px-8 py-5">Timestamp</th>
                                    <th className="px-8 py-5">User / Actor</th>
                                    <th className="px-8 py-5">Action Type</th>
                                    <th className="px-8 py-5">Details / Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">Decrypting audit trail...</p>
                                        </td>
                                    </tr>
                                ) : logs?.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <Info className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold uppercase tracking-widest">No activities recorded yet</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logs?.map((log) => (
                                        <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-600" />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-300">
                                                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 font-mono uppercase">
                                                            {format(new Date(log.created_at), 'hh:mm:ss a')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                                        <User className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{log.actor?.full_name || 'System / Auto'}</p>
                                                        <p className="text-xs text-slate-500">{log.actor?.email || 'automated@casebridge.io'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                    {formatAction(log.action)}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="max-w-[300px]">
                                                    {renderMetadata(log.metadata)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 bg-white/[0.01] border-t border-white/5 text-center">
                        <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase italic">
                            Immutable Ledger System - Protected by Enterprise Encryption
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
