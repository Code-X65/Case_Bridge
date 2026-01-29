import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { useNavigate } from 'react-router-dom';
import {
    Users, AlertCircle, Clock, Shield,
    ChevronRight, Loader2, FileText, Calendar,
    MessageSquare, Activity
} from 'lucide-react';

export default function ClientBehaviorPage() {
    const { session, isLoading } = useInternalSession();
    const navigate = useNavigate();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [details, setDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (!isLoading && session) {
            // Strict Role Guard
            const role = session.role;
            if (role !== 'admin_manager' && role !== 'case_manager' && role !== 'admin') {
                navigate('/auth/unauthorized');
                return;
            }
            if (session.firm_id) fetchOverview();
        }
    }, [session, isLoading]);

    const fetchOverview = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('client_analytics_overview')
            .select('*')
            .eq('firm_id', session!.firm_id)
            .order('last_activity_at', { ascending: false });

        if (error) console.error('Error fetching analytics:', error);
        if (data) setClients(data);
        setLoading(false);
    };

    const handleSelectClient = async (client: any) => {
        setSelectedClient(client);
        setLoadingDetails(true);

        try {
            // 1. Fetch Interactions (Docs & Messages)
            const { count: viewCount } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact', head: true })
                .eq('actor_id', client.client_id)
                .eq('action', 'document_viewed');

            // 2. Scheduling Stats
            const { data: meetings } = await supabase
                .from('case_meetings')
                .select('status')
                .eq('client_id', client.client_id);

            const meetingStats = {
                requested: meetings?.filter(m => m.status === 'requested').length || 0,
                accepted: meetings?.filter(m => m.status === 'accepted').length || 0,
                cancelled: meetings?.filter(m => m.status === 'cancelled').length || 0,
                total: meetings?.length || 0
            };

            setDetails({
                docViews: viewCount || 0,
                meetingStats,
                lastActive: client.last_activity_at
            });

        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetails(false);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-[#0F172A] text-white font-sans">
            <InternalSidebar />
            <main className="flex-1 ml-64 p-12">
                <header className="mb-10">
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">Client Behaviour & Analytics</h1>
                    <p className="text-slate-400 max-w-2xl">
                        Operational intelligence on client responsiveness, document engagement, and risk patterns.
                        <span className="block mt-2 text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Shield size={12} /> Governance Frozen v1
                        </span>
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Table */}
                    <div className="lg:col-span-2 bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Users size={18} className="text-indigo-400" /> Client Overview
                            </h3>
                            <span className="text-xs font-bold bg-white/5 px-2 py-1 rounded text-slate-400">{clients.length} Clients</span>
                        </div>

                        {loading ? (
                            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#0F172A] text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Cases</th>
                                            <th className="px-6 py-4">Pending</th>
                                            <th className="px-6 py-4">Last Active</th>
                                            <th className="px-6 py-4">Risk Status</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {clients.map(c => (
                                            <tr key={c.client_id}
                                                onClick={() => handleSelectClient(c)}
                                                className={`cursor-pointer transition-colors ${selectedClient?.client_id === c.client_id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
                                            >
                                                <td className="px-6 py-4 font-bold text-white">
                                                    {c.client_name}
                                                    <span className="block text-[10px] font-normal text-slate-500">{c.email}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-white font-bold">{c.active_cases}</span>
                                                    <span className="text-slate-500 ml-1">/ {c.total_cases}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.pending_client_actions > 0 ? (
                                                        <span className="text-amber-400 font-bold">{c.pending_client_actions}</span>
                                                    ) : (
                                                        <span className="text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                    {c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString() : 'Never'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${c.risk_status === 'High Risk' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                            c.risk_status === 'Attention Needed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {c.risk_status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <ChevronRight size={16} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 h-fit sticky top-10">
                        {!selectedClient ? (
                            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
                                <Activity size={32} className="mb-4 opacity-50" />
                                <p className="text-sm">Select a client to view<br />behavioural analysis.</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="border-b border-white/5 pb-6 mb-6">
                                    <h2 className="text-xl font-black text-white mb-1">{selectedClient.client_name}</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedClient.risk_status}</p>
                                </div>

                                {loadingDetails ? (
                                    <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Activity */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <FileText size={12} /> Document Interaction
                                            </h4>
                                            <div className="bg-[#0F172A] rounded-xl p-4 border border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-slate-400">Unique Views</span>
                                                    <span className="text-white font-bold">{details?.docViews || 0}</span>
                                                </div>
                                                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                                    <div className="bg-indigo-500 h-full" style={{ width: `${Math.min((details?.docViews || 0) * 10, 100)}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-slate-600 mt-2">
                                                    Tracks explicit unique document openings.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Scheduling */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={12} /> Scheduling
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-[#0F172A] p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-slate-500 uppercase mb-1 block">Requested</span>
                                                    <span className="text-lg font-bold text-white">{details?.meetingStats?.requested}</span>
                                                </div>
                                                <div className="bg-[#0F172A] p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-slate-500 uppercase mb-1 block">Completed</span>
                                                    <span className="text-lg font-bold text-emerald-400">{details?.meetingStats?.accepted}</span>
                                                </div>
                                                <div className="bg-[#0F172A] p-3 rounded-xl border border-white/5">
                                                    <span className="text-[10px] text-slate-500 uppercase mb-1 block">Cancelled</span>
                                                    <span className="text-lg font-bold text-red-400">{details?.meetingStats?.cancelled}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Msg */}
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <MessageSquare size={12} /> Responsiveness
                                            </h4>
                                            <div className="bg-[#0F172A] rounded-xl p-4 border border-white/5">
                                                <p className="text-sm text-slate-400 mb-1">Pending Actions</p>
                                                <p className="text-2xl font-bold text-white">{selectedClient.pending_client_actions}</p>
                                                {selectedClient.pending_client_actions > 0 && (
                                                    <p className="text-xs text-amber-400 mt-1">Client has unread items.</p>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
