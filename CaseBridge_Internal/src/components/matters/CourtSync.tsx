import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    RefreshCw,
    Gavel,
    Calendar,
    AlertCircle,
    ExternalLink,
    Loader2,
    CheckCircle2,
    Clock,
    Search,
    FileText
} from 'lucide-react';

interface CourtSyncProps {
    matterId: string;
}

export default function CourtSync({ matterId }: CourtSyncProps) {
    const queryClient = useQueryClient();
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Fetch Docket Info
    const { data: docket, isLoading: docketLoading } = useQuery({
        queryKey: ['court_docket', matterId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('court_dockets')
                .select('*')
                .eq('matter_id', matterId)
                .maybeSingle();
            if (error) throw error;
            return data;
        }
    });

    // 2. Fetch Filings
    const { data: filings, isLoading: filingsLoading } = useQuery({
        queryKey: ['docket_filings', docket?.id],
        enabled: !!docket?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('docket_filings')
                .select('*')
                .eq('docket_id', docket!.id)
                .order('filed_date', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // 3. Sync Mutation
    const runSync = useMutation({
        mutationFn: async () => {
            setIsSyncing(true);
            try {
                const { error } = await supabase.rpc('mock_pacer_sync', {
                    p_docket_id: docket!.id
                });
                if (error) throw error;
            } finally {
                setIsSyncing(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['docket_filings', docket!.id] });
            queryClient.invalidateQueries({ queryKey: ['court_docket', matterId] });
        }
    });

    if (docketLoading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    if (!docket) return (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 text-center italic">
            <p className="text-slate-500 mb-4 text-xs font-bold uppercase tracking-widest">No Court Docket Linked</p>
            <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">Link PACER Case</button>
        </div>
    );

    return (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <Gavel size={24} />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Federal Court Sync</h3>
                        <p className="text-xl font-black text-white italic">{docket.court_name} • {docket.case_number}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> Bi-Directional Active
                        </p>
                    </div>
                    <button
                        onClick={() => runSync.mutate()}
                        disabled={isSyncing}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-900/40 text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Sync PACER
                    </button>
                </div>
            </div>

            <div className="bg-black/20 rounded-2xl border border-white/5 p-6 overflow-hidden relative">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <Search size={12} /> Recent Docket Filings
                </h4>

                <div className="space-y-4">
                    {filingsLoading ? <Loader2 className="animate-spin mx-auto text-indigo-500" /> :
                        filings?.length === 0 ? <p className="text-xs text-slate-600 italic py-4">Waiting for initial synchronization...</p> :
                            filings?.map(filing => (
                                <div key={filing.id} className={`p-4 rounded-xl border transition-all flex items-start gap-4 ${filing.is_deadline_trigger ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/5'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${filing.is_deadline_trigger ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'
                                        }`}>
                                        {filing.is_deadline_trigger ? <AlertCircle size={16} /> : <FileText size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-black text-white">{filing.description}</p>
                                            <span className="text-[10px] text-slate-500 font-bold">{new Date(filing.filed_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-black">Entry #{filing.entry_number}</p>
                                            {filing.is_deadline_trigger && (
                                                <span className="text-[10px] text-amber-500 font-black uppercase flex items-center gap-1 animate-pulse">
                                                    <Calendar size={10} /> Deadline Trigger Flagged
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="p-2 text-slate-600 hover:text-white transition-colors">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 italic">
                    <p className="flex items-center gap-2">
                        <Clock size={12} /> Last synced: {docket.last_sync_at ? new Date(docket.last_sync_at).toLocaleString() : 'Never'}
                    </p>
                    <p>PACER credentials verified via firm-vault</p>
                </div>
            </div>
        </div>
    );
}
