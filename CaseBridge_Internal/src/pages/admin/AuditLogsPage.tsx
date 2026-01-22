import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { Shield, Search, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('firm_id, internal_role')
                .eq('id', user.id)
                .single();

            return data;
        },
    });

    const { data: logs, isLoading } = useQuery({
        queryKey: ['audit-logs', profile?.firm_id, filterAction],
        queryFn: async () => {
            if (!profile?.firm_id) return [];

            let query = supabase
                .from('audit_logs')
                .select(`
          *,
          actor:profiles!audit_logs_actor_id_fkey(first_name, last_name, email),
          target:profiles!audit_logs_target_user_id_fkey(first_name, last_name, email)
        `)
                .eq('firm_id', profile.firm_id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (filterAction !== 'all') {
                query = query.eq('action', filterAction);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        },
        enabled: !!profile?.firm_id,
    });

    const getActionBadge = (action: string) => {
        const actionMap: Record<string, { label: string; color: string }> = {
            'user_invited': { label: 'User Invited', color: 'bg-blue-100 text-blue-700' },
            'user_accepted_invitation': { label: 'Invitation Accepted', color: 'bg-green-100 text-green-700' },
            'user_suspended': { label: 'User Suspended', color: 'bg-amber-100 text-amber-700' },
            'user_active': { label: 'User Activated', color: 'bg-green-100 text-green-700' },
            'user_deactivated': { label: 'User Deactivated', color: 'bg-red-100 text-red-700' },
            'firm_profile_updated': { label: 'Firm Updated', color: 'bg-purple-100 text-purple-700' },
            'case_assigned': { label: 'Case Assigned', color: 'bg-indigo-100 text-indigo-700' },
            'case_status_changed': { label: 'Status Changed', color: 'bg-cyan-100 text-cyan-700' },
        };

        const config = actionMap[action] || { label: action, color: 'bg-slate-100 text-slate-700' };

        return (
            <span className={`inline-block px-3 py-1 text-[10px] font-semibold uppercase rounded-md ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const filteredLogs = logs?.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(searchLower) ||
            log.actor?.email?.toLowerCase().includes(searchLower) ||
            log.target?.email?.toLowerCase().includes(searchLower)
        );
    });

    const uniqueActions = Array.from(new Set(logs?.map(log => log.action) || []));

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-slate-900 uppercase tracking-tight">
                    Audit Logs
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    View all system activity and user actions
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-4 rounded-md border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full h-10 pl-11 pr-4 bg-slate-50 border-transparent focus:bg-white focus:ring-primary rounded-md text-sm font-semibold transition-all outline-none"
                    />
                </div>
                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="h-10 px-4 bg-slate-50 border-transparent focus:bg-white focus:ring-primary rounded-md text-sm font-semibold transition-all outline-none"
                >
                    <option value="all">All Actions</option>
                    {uniqueActions.map(action => (
                        <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                    ))}
                </select>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Timestamp</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Action</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Performed By</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Target</th>
                                <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : filteredLogs?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs?.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {log.actor?.first_name} {log.actor?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{log.actor?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.target ? (
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {log.target.first_name} {log.target.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{log.target.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.details ? (
                                                <div className="flex items-start gap-2">
                                                    <FileText className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                                                    <pre className="text-xs text-slate-600 font-mono max-w-xs overflow-hidden text-ellipsis">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Actions (30d)</p>
                    </div>
                    <p className="text-2xl font-semibold text-slate-900">
                        {logs?.filter(l => new Date(l.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="h-5 w-5 text-amber-600" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Security Alerts</p>
                    </div>
                    <p className="text-2xl font-semibold text-slate-900">
                        {logs?.filter(l => ['user_suspended', 'user_deactivated'].includes(l.action)).length || 0}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Most Active User</p>
                    </div>
                    <p className="text-2xl font-semibold text-slate-900 truncate">
                        {(() => {
                            if (!logs || logs.length === 0) return 'None';
                            const counts: Record<string, number> = {};
                            logs.forEach(l => {
                                const name = `${l.actor?.first_name} ${l.actor?.last_name}`;
                                counts[name] = (counts[name] || 0) + 1;
                            });
                            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
                        })()}
                    </p>
                </div>
            </div>
        </div>
    );
}
