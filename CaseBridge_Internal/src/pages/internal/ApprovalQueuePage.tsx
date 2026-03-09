import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    CheckCircle2, Clock, Search,
    FileText, Loader2,
    Eye, Check, X, ArrowRight
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { format } from 'date-fns';
import ClientReportPreview from '@/components/matters/ClientReportPreview';
import { useToast } from '@/components/common/ToastService';
import { useConfirm } from '@/components/common/ConfirmDialogProvider';
import Skeleton from '@/components/ui/Skeleton';

export default function ApprovalQueuePage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAuthor, setFilterAuthor] = useState('all');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    // Preview State
    const [previewReport, setPreviewReport] = useState<any>(null);

    // 1. Fetch all pending reports (under_review) for the firm
    const { data: pendingReports, isLoading } = useQuery({
        queryKey: ['global_approval_queue', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_updates')
                .select(`
                    *,
                    author:author_id ( full_name ),
                    matter:matter_id ( id, title, matter_number )
                `)
                .eq('status', 'under_review')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        }
    });

    // Mutations
    const approveReport = useMutation({
        mutationFn: async (reportId: string) => {
            const { error } = await supabase
                .from('matter_updates')
                .update({ status: 'published', client_visible: true })
                .eq('id', reportId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global_approval_queue'] });
        }
    });

    const bulkApprove = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('matter_updates')
                .update({ status: 'published', client_visible: true })
                .in('id', ids);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global_approval_queue'] });
            setSelectedIds([]);
            toast('Selected reports approved and published to client portal.', 'success');
        }
    });

    const rejectReport = useMutation({
        mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
            const { error } = await supabase
                .from('matter_updates')
                .update({ status: 'rejected', rejection_reason: reason })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global_approval_queue'] });
        }
    });

    // Filter Logic
    const filteredReports = pendingReports?.filter(r => {
        const matchesSearch = r.matter?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAuthor = filterAuthor === 'all' || r.author_id === filterAuthor;
        return matchesSearch && matchesAuthor;
    });

    // Get unique authors
    const authors = Array.from(new Set(pendingReports?.map(r => JSON.stringify({ id: r.author_id, name: r.author?.full_name })) || []))
        .map(s => JSON.parse(s));

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-7xl mx-auto">
                <header className="mb-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Approval Queue</h1>
                            <p className="text-slate-400 text-sm">Centralized oversight for all pending reports and document updates.</p>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by matter or report title..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1E293B] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={filterAuthor}
                            onChange={e => setFilterAuthor(e.target.value)}
                            className="bg-[#1E293B] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Authors</option>
                            {authors.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={async () => {
                                if (await confirm({ title: 'Approve Reports', message: `Approve ${selectedIds.length} reports for publishing to client portals?`, confirmText: 'Approve' })) {
                                    bulkApprove.mutate(selectedIds);
                                }
                            }}
                            disabled={selectedIds.length === 0 || bulkApprove.isPending}
                            className={`px-6 py-3 font-bold rounded-xl transition-all shadow-lg text-sm whitespace-nowrap flex items-center gap-2 ${selectedIds.length > 0
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                }`}
                        >
                            {bulkApprove.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            Approve {selectedIds.length > 0 ? `(${selectedIds.length})` : 'Selected'}
                        </button>
                    </div>
                </div>

                {filteredReports && filteredReports.length > 0 && (
                    <div className="flex items-center gap-4 mb-4 px-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === filteredReports.length}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedIds(filteredReports.map(r => r.id));
                                    } else {
                                        setSelectedIds([]);
                                    }
                                }}
                                className="w-5 h-5 rounded border-white/10 bg-[#1E293B] text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">Select All in View</span>
                        </label>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <Skeleton className="w-5 h-5 shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex gap-2">
                                            <Skeleton className="w-16 h-4" />
                                            <Skeleton className="w-48 h-5" />
                                        </div>
                                        <div className="flex gap-4">
                                            <Skeleton className="w-24 h-3" />
                                            <Skeleton className="w-24 h-3" />
                                            <Skeleton className="w-24 h-3" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Skeleton className="w-10 h-10" />
                                    <Skeleton className="w-10 h-10" />
                                    <Skeleton className="w-24 h-12" />
                                    <Skeleton className="w-24 h-12" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredReports?.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center bg-[#1E293B]/50 border border-dashed border-white/10 rounded-2xl text-slate-500">
                        <CheckCircle2 className="w-12 h-12 mb-4 opacity-20 text-emerald-500" />
                        <p className="font-bold">Queue is clear!</p>
                        <p className="text-xs mt-1">All reports have been reviewed and processed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredReports?.map(report => (
                            <div key={report.id} className={`bg-[#1E293B] border rounded-2xl p-6 group transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${selectedIds.includes(report.id) ? 'border-indigo-500 shadow-xl shadow-indigo-900/10' : 'border-white/10 hover:border-indigo-500/30'
                                }`}>
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(report.id)}
                                        onChange={() => {
                                            setSelectedIds(prev =>
                                                prev.includes(report.id)
                                                    ? prev.filter(id => id !== report.id)
                                                    : [...prev, report.id]
                                            );
                                        }}
                                        className="w-5 h-5 rounded border-white/10 bg-[#0F172A] text-indigo-600 focus:ring-indigo-500 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                {report.matter?.matter_number || 'Case-X'}
                                            </span>
                                            <h3 className="text-lg font-bold text-white truncate">{report.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <p className="flex items-center gap-1.5 line-clamp-1">
                                                <FileText size={14} className="text-slate-600" />
                                                Matter: <span className="text-white font-medium">{report.matter?.title}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                                Author: <span className="text-indigo-400 font-bold">{report.author?.full_name}</span>
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-slate-600" />
                                                {format(new Date(report.created_at), 'MMM d, h:mm a')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => setPreviewReport(report)}
                                        className="p-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl transition-all"
                                        title="Quick Preview"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => window.open(`/internal/matter/${report.matter_id}`, '_blank')}
                                        className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
                                        title="View Case Workspace"
                                    >
                                        <ArrowRight size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const reason = prompt('Reason for rejection:');
                                            if (reason) rejectReport.mutate({ id: report.id, reason });
                                        }}
                                        className="h-12 px-6 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/30 text-rose-400 hover:text-white font-bold rounded-xl transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <X size={14} /> Return
                                    </button>
                                    <button
                                        onClick={() => approveReport.mutate(report.id)}
                                        className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <Check size={14} /> Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-12 flex items-center gap-8 border-t border-white/5 pt-8">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Under Review</span>
                    </div>
                </div>

                {previewReport && (
                    <ClientReportPreview
                        report={previewReport}
                        authorName={previewReport.author?.full_name || 'Associate'}
                        matterTitle={previewReport.matter?.title || 'Matter'}
                        attachments={[]}
                        onClose={() => setPreviewReport(null)}
                    />
                )}
            </main>
        </div>
    );
}
