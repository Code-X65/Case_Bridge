import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ChevronDown, ChevronUp, Download, ShieldCheck,
    AlertCircle, FileText, History, PenTool, CheckCircle2, Clock
} from 'lucide-react';
import SignRequestModal from '@/components/matters/SignRequestModal';
import { useToast } from '@/components/common/ToastService';
import Skeleton from '@/components/ui/Skeleton';

interface DocumentVaultProps {
    matterId: string;
    caseReportId?: string;
    isCaseManager: boolean;
}

interface VaultDocument {
    id: string;
    filename: string;
    file_url: string;
    esign_status?: string;
    approval_status: string;
    created_at: string;
    uploaded_by_role?: string;
    source: 'report' | 'intake' | 'client_vault';
}

// SignRequestModal removed from here and moved to separate file

export default function DocumentVault({ matterId, caseReportId, isCaseManager }: DocumentVaultProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [signModalDoc, setSignModalDoc] = useState<any>(null);

    // Unified Document Fetching
    const { data: allDocs, isLoading } = useQuery({
        queryKey: ['matter_documents_vault', matterId, caseReportId],
        queryFn: async () => {
            // 1. Fetch Report Documents
            const { data: reports } = await supabase
                .from('matter_updates')
                .select('id')
                .eq('matter_id', matterId);

            const reportIds = reports?.map(r => r.id) || [];
            let reportDocs: any[] = [];
            if (reportIds.length > 0) {
                const { data } = await supabase
                    .from('report_documents')
                    .select(`
                        id, document_id,
                        document: document_id(
                            id, filename, file_url, esign_status, approval_status, created_at, uploaded_by_role
                        )
                    `)
                    .in('report_id', reportIds);
                reportDocs = data || [];
            }

            // 2. Fetch Intake Documents
            let intakeDocs: any[] = [];
            if (caseReportId) {
                const { data } = await supabase
                    .from('case_report_documents')
                    .select('*')
                    .eq('case_report_id', caseReportId);
                intakeDocs = data || [];
            }

            // 3. Fetch Client Vault Documents
            const { data: clientDocsData } = await supabase
                .from('client_documents')
                .select('*')
                .eq('matter_id', matterId);
            const clientDocs = clientDocsData || [];

            // Transform into unified format
            const unified: VaultDocument[] = [
                ...reportDocs.filter(rd => rd.document).map(rd => ({
                    id: rd.document.id,
                    filename: rd.document.filename,
                    file_url: rd.document.file_url,
                    esign_status: rd.document.esign_status,
                    approval_status: rd.document.approval_status || 'pending',
                    created_at: rd.document.created_at,
                    uploaded_by_role: rd.document.uploaded_by_role,
                    source: 'report' as const
                })),
                ...intakeDocs.map(idoc => ({
                    id: idoc.id,
                    filename: idoc.file_name,
                    file_url: idoc.file_path,
                    approval_status: idoc.approval_status || 'pending',
                    created_at: idoc.created_at,
                    uploaded_by_role: 'client',
                    source: 'intake' as const
                })),
                ...clientDocs.map(cdoc => ({
                    id: cdoc.id,
                    filename: cdoc.file_name,
                    file_url: cdoc.file_url,
                    approval_status: cdoc.approval_status || 'pending',
                    created_at: cdoc.uploaded_at,
                    uploaded_by_role: 'client',
                    source: 'client_vault' as const
                }))
            ];

            // Sort by date descending
            return unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    });


    // Unified Approval Mutation
    const updateDocStatus = useMutation({
        mutationFn: async ({ docId, source, status }: { docId: string; source: VaultDocument['source']; status: 'approved' | 'rejected' }) => {
            let table = '';
            switch (source) {
                case 'report': table = 'documents'; break;
                case 'intake': table = 'case_report_documents'; break;
                case 'client_vault': table = 'client_documents'; break;
            }

            const { error } = await supabase
                .from(table)
                .update({ approval_status: status })
                .eq('id', docId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['matter_documents_vault', matterId] });
            toast(`Document ${variables.status}.`, 'success');
        }
    });


    // Fetch active signature requests for this matter
    const { data: signRequests } = useQuery({
        queryKey: ['signature_requests', matterId],
        queryFn: async () => {
            const { data } = await supabase
                .from('signature_requests')
                .select('*')
                .eq('matter_id', matterId)
                .order('created_at', { ascending: false });
            return data || [];
        }
    });


    const handleDownload = async (url: string) => {
        const { data } = await supabase.storage.from('case_documents').createSignedUrl(url, 60);
        if (data) window.open(data.signedUrl, '_blank');
    };

    const getSignStatus = (docId: string) => {
        return signRequests?.find(r => r.document_id === docId);
    };

    if (isLoading) return (
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 space-y-4">
            <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Unified Document Governance
            </h3>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );

    return (
        <>
            {signModalDoc && (
                <SignRequestModal
                    doc={signModalDoc}
                    matterId={matterId}
                    onClose={() => setSignModalDoc(null)}
                    onSuccess={() => {
                        setSignModalDoc(null);
                        queryClient.invalidateQueries({ queryKey: ['matter_documents_vault', matterId] });
                        toast('eSignature request sent.', 'success');
                    }}
                />
            )}

            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-400" /> Unified Document Governance
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-2">
                            {allDocs?.length || 0} Total Objects
                        </span>
                    </h3>
                </div>

                <div className="space-y-4">
                    {!allDocs || allDocs.length === 0 ? (
                        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <FileText className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                            <p className="text-xs text-slate-500 italic">No formal documents recorded for this file.</p>
                        </div>
                    ) : (
                        allDocs.map((doc) => {
                            const signReq = getSignStatus(doc.id);
                            return (
                                <div key={doc.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                                    <div className="p-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.source === 'intake' ? 'bg-amber-500/10 text-amber-400' :
                                                    doc.source === 'report' ? 'bg-indigo-500/10 text-indigo-400' :
                                                        'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-bold text-white truncate max-w-[200px]">{doc.filename}</p>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${doc.source === 'intake' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            doc.source === 'report' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {doc.source?.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-2">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                    <span>•</span>
                                                    <span className="uppercase font-bold text-slate-600">{doc.uploaded_by_role || 'client'}</span>
                                                </p>

                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {/* Approval Status */}
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${doc.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            doc.approval_status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        }`}>
                                                        {doc.approval_status === 'approved' ? <CheckCircle2 size={9} /> : doc.approval_status === 'rejected' ? <AlertCircle size={9} /> : <Clock size={9} />}
                                                        {doc.approval_status || 'pending'}
                                                    </span>

                                                    {/* eSign Status (Report Docs Only) */}
                                                    {doc.source === 'report' && (
                                                        signReq ? (
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1 ${signReq.status === 'signed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                                {signReq.status === 'signed' ? <CheckCircle2 size={9} /> : <Clock size={9} />} Sign: {signReq.status}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Unsigned</span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => handleDownload(doc.file_url)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Download">
                                                <Download size={16} />
                                            </button>

                                            {isCaseManager && (
                                                <div className="flex items-center gap-1 border-x border-white/5 px-1 mx-1">
                                                    <button
                                                        onClick={() => updateDocStatus.mutate({ docId: doc.id, source: doc.source, status: 'approved' })}
                                                        disabled={doc.approval_status === 'approved' || updateDocStatus.isPending}
                                                        className={`p-2 rounded-lg transition-colors ${doc.approval_status === 'approved' ? 'text-emerald-500/50' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => updateDocStatus.mutate({ docId: doc.id, source: doc.source, status: 'rejected' })}
                                                        disabled={doc.approval_status === 'rejected' || updateDocStatus.isPending}
                                                        className={`p-2 rounded-lg transition-colors ${doc.approval_status === 'rejected' ? 'text-rose-500/50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'}`}
                                                    >
                                                        <AlertCircle size={16} />
                                                    </button>
                                                </div>
                                            )}

                                            {isCaseManager && doc.source === 'report' && (!signReq || signReq.status === 'declined') && (
                                                <button onClick={() => setSignModalDoc(doc)} className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors">
                                                    <PenTool size={16} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setExpandedIds(prev => prev.includes(doc.id) ? prev.filter(i => i !== doc.id) : [...prev, doc.id])}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                {expandedIds.includes(doc.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedIds.includes(doc.id) && (
                                        <div className="bg-black/20 border-t border-white/5 p-4">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><History size={10} /> Document Audit Trail</p>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5 text-xs">
                                                    <div>
                                                        <p className="font-bold text-white">System Record Initialized</p>
                                                        <p className="text-slate-500 mt-0.5">{new Date(doc.created_at).toLocaleString()}</p>
                                                    </div>
                                                    <span className="px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-400">Archived</span>
                                                </div>
                                                {signReq && (
                                                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                                                        <div className="text-xs">
                                                            <p className="font-bold text-white">eSignature Request</p>
                                                            <p className="text-slate-500 mt-0.5">{signReq.status} on {new Date(signReq.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                        {signReq.signature_data && <img src={signReq.signature_data} alt="Sign" className="h-8 bg-white/80 rounded" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
