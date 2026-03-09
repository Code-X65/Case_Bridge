import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Briefcase, FileText, Send, UserPlus,
    Download, CheckCircle2, Search, Mail, Copy,
    Clock, Shield, History, X, Check, Eye, PenTool,
    ArrowLeft, EyeOff, AlertCircle, ShieldCheck, Loader2, MessageSquare,
    Paperclip, Upload, Calendar
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import InternalSidebar from '@/components/layout/InternalSidebar';
import MatterStageTracker from '@/components/matters/MatterStageTracker';
import MatterTasks from '@/components/matters/MatterTasks';
import MatterNotesHub from '@/components/matters/MatterNotesHub';
import DocumentVault from '@/components/matters/DocumentVault';
import CourtSync from '@/components/matters/CourtSync';
import ClientReportPreview from '@/components/matters/ClientReportPreview';
import SignRequestModal from '@/components/matters/SignRequestModal';
import MatterChat from '@/components/matters/MatterChat';
import Skeleton from '@/components/ui/Skeleton';
import { useToast } from '@/components/common/ToastService';
import { useConfirm } from '@/components/common/ConfirmDialogProvider';

export default function MatterWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { confirm } = useConfirm();

    const [reportTitle, setReportTitle] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [isFinalReport, setIsFinalReport] = useState(false);
    const [clientVisible, setClientVisible] = useState(true); // Default to visible per request
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 5;
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [previewReport, setPreviewReport] = useState<any>(null);
    const [signModalDoc, setSignModalDoc] = useState<any>(null);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);
    const [rejectionFeedback, setRejectionFeedback] = useState<{ [key: string]: string }>({});
    const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
    const [closureSummary, setClosureSummary] = useState('');
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const fetchUnreadChatCount = async () => {
        if (!id) return;
        const { data, error } = await supabase.rpc('get_unread_chat_count', { p_matter_id: id });
        if (!error) setUnreadChatCount(data || 0);
    };

    // Subscription for chat badges
    useEffect(() => {
        if (!id || !session?.user_id) return;
        
        fetchUnreadChatCount();

        const channel = supabase
            .channel(`internal_unread_badge:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matter_messages',
                    filter: `matter_id=eq.${id}`
                },
                (payload) => {
                    if (payload.new.sender_id !== session.user_id) {
                        fetchUnreadChatCount();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'matter_messages',
                    filter: `matter_id=eq.${id}`
                },
                () => {
                    fetchUnreadChatCount();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, session?.user_id]);

    const isAdminManager = session?.role === 'admin_manager' || session?.role === 'admin';
    const isCaseManager = session?.role === 'case_manager' || isAdminManager;

    // 1. Fetch Matter Details
    const { data: matter, isLoading: isMatterLoading } = useQuery({
        queryKey: ['matter', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matters')
                .select(`
                    *,
                    assignee:assigned_associate ( id, full_name, email ),
                    case_manager:assigned_case_manager ( id, full_name ),
                    client:client_id ( id, first_name, last_name, email, phone ),
                    case_report:case_report_id ( id, intake_plan ) 
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        }
    });



    // 2. Fetch Reports
    const { data: reportData, isLoading: reportsLoading } = useQuery({
        queryKey: ['matter_updates', id, page],
        enabled: !!id,
        queryFn: async () => {
            const { data, error, count } = await supabase
                .from('matter_updates')
                .select(`
                    *,
                    author:author_id ( full_name ),
                    docs:report_documents (
                        document:document_id (
                            id,
                            filename,
                            file_url
                        )
                    )
                `, { count: 'exact' })
                .eq('matter_id', id)
                .order('created_at', { ascending: false })
                .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

            if (error) {
                console.error('❌ [matter_updates GET] Supabase error:', JSON.stringify(error, null, 2));
                throw error;
            }
            return { reports: data || [], totalCount: count || 0 };
        }
    });

    const reports = reportData?.reports || [];
    const totalReports = reportData?.totalCount || 0;
    const totalPages = Math.ceil(totalReports / ITEMS_PER_PAGE);

    // 3. Fetch Audit Timeline
    const { data: timeline } = useQuery({
        queryKey: ['matter_timeline', id],
        enabled: !!id,
        queryFn: async () => {
            const { data } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('target_id', id)
                .order('created_at', { ascending: false });

            if (data && data.length === 0) {
                const { data: mdData } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .contains('metadata', { matter_id: id })
                    .order('created_at', { ascending: false });
                return mdData || [];
            }
            return data || [];
        }
    });

    // 4. Fetch Scheduled Meetings
    const { data: meetings } = useQuery({
        queryKey: ['matter_meetings', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('case_meetings')
                .select('*')
                .eq('case_id', id)
                .order('proposed_start', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    // 6. Fetch Communication Logs (Roadmap #8)
    const { data: communications } = useQuery({
        queryKey: ['matter_communications', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_communications')
                .select('*')
                .eq('matter_id', id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    // 7. Fetch Matter Deadlines
    const { data: matterDeadlines } = useQuery({
        queryKey: ['matter_deadlines', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('matter_deadlines')
                .select('*')
                .eq('matter_id', id)
                .order('deadline_date', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    // 8. Fetch Original Intake Documents
    const { data: intakeDocs } = useQuery({
        queryKey: ['matter_intake_docs', matter?.case_report_id],
        enabled: !!matter?.case_report_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('case_report_documents')
                .select('*')
                .eq('case_report_id', matter.case_report_id);
            return data || [];
        }
    });

    // Mutations
    const submitReport = useMutation({
        mutationFn: async (statusOverride?: string) => {
            setIsUploading(true);
            try {
                const insertPayload = {
                    matter_id: id,
                    author_id: session?.user_id,
                    author_role: isCaseManager ? 'case_manager' : 'associate_lawyer',
                    title: reportTitle,
                    content: reportContent,
                    status: statusOverride || (isCaseManager ? 'published' : 'under_review'),
                    client_visible: isCaseManager ? clientVisible : false,
                    is_final: isFinalReport
                };
                console.log('📤 [matter_updates POST] Inserting payload:', insertPayload);

                const { data: update, error: updateError } = editingReportId
                    ? await supabase
                        .from('matter_updates')
                        .update(insertPayload)
                        .eq('id', editingReportId)
                        .select()
                        .single()
                    : await supabase
                        .from('matter_updates')
                        .insert(insertPayload)
                        .select()
                        .single();

                if (updateError) {
                    console.error('❌ [matter_updates POST] Supabase error:', JSON.stringify(updateError, null, 2));
                    throw updateError;
                }

                if (selectedFiles.length > 0) {
                    for (const file of selectedFiles) {
                        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const filePath = `matters/${id}/updates/${update.id}/${sanitizedName}`;

                        const { error: uploadError } = await supabase.storage.from('case_documents').upload(filePath, file);
                        if (uploadError) console.warn('⚠️ Storage upload failed:', uploadError.message);

                        const docPayload = {
                            filename: file.name,
                            file_url: filePath,
                            uploaded_by_user_id: session?.user_id,
                            uploaded_by_role: isCaseManager ? 'case_manager' : 'associate_lawyer'
                        };
                        console.log('📄 [documents INSERT] payload:', docPayload);

                        const { data: doc, error: docError } = await supabase
                            .from('documents')
                            .insert(docPayload)
                            .select().single();

                        if (docError) {
                            console.error('❌ [documents INSERT] error:', JSON.stringify(docError, null, 2));
                            continue; // skip report_documents if doc failed
                        }

                        if (doc) {
                            const rdPayload = { report_id: update.id, document_id: doc.id, client_visible: clientVisible };
                            console.log('📎 [report_documents INSERT] payload:', rdPayload);

                            const { error: rdError } = await supabase.from('report_documents').insert(rdPayload);

                            if (rdError) {
                                console.error('❌ [report_documents INSERT] error:', JSON.stringify(rdError, null, 2));
                            }
                        }
                    }
                }

            } finally {
                setIsUploading(false);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_updates', id] });
            queryClient.invalidateQueries({ queryKey: ['matter', id] });
            queryClient.invalidateQueries({ queryKey: ['matter_timeline', id] });
            setReportTitle(''); setReportContent(''); setIsFinalReport(false);
            setClientVisible(false); setSelectedFiles([]);
            setEditingReportId(null);
            toast(editingReportId ? 'Report updated successfully.' : 'Report submitted successfully.', 'success');
        }
    });

    const closeMatter = useMutation({
        mutationFn: async (summary: string) => {
            const { error } = await supabase.rpc('transition_matter_lifecycle', {
                p_matter_id: id,
                p_new_state: 'closed',
                p_resolution_summary: summary
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter', id] });
            setIsClosureModalOpen(false);
            toast('Matter has been closed.', 'success');
        }
    });

    const toggleChat = useMutation({
        mutationFn: async (enabled: boolean) => {
            const { data, error } = await supabase.rpc('toggle_matter_chat_v2', {
                matter_id_input: id,
                enabled_input: enabled
            });
            if (error) {
                console.error("Group Chat Activation Error:", error);
                throw error;
            }
            return data;
        },
        onSuccess: (_, enabled) => {
            queryClient.invalidateQueries({ queryKey: ['matter', id] });
            toast(`Group chat has been ${enabled ? 'activated' : 'deactivated'}.`, 'success');
        },
        onError: (error: any) => {
            toast(error.message || 'Failed to toggle chat status.', 'error');
        }
    });



    const approveReport = useMutation({
        mutationFn: async (reportId: string) => {
            const { error } = await supabase
                .from('matter_updates')
                .update({ status: 'published', client_visible: true, rejection_reason: null })
                .eq('id', reportId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_updates', id] });
            toast('Report approved and published to client portal.', 'success');
        }
    });

    const rejectReport = useMutation({
        mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
            const { error } = await supabase
                .from('matter_updates')
                .update({ status: 'rejected', rejection_reason: reason, client_visible: false })
                .eq('id', reportId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter_updates', id] });
            toast('Report returned to associate with comments.', 'success');
        }
    });

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage.from('case_documents').createSignedUrl(fileUrl, 60);
        if (data) window.open(data.signedUrl, '_blank');
    };

    const handleViewDocument = async (fileUrl: string, fileName: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 3600); // 1 hour

        if (data) {
            setViewingDocument({ url: data.signedUrl, name: fileName });
            setViewerOpen(true);
        }
    };

    if (isMatterLoading) return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />
            <div className="ml-64 p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pt-8">
                    <Skeleton className="w-96 h-12" />
                    <Skeleton className="w-32 h-10" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-[500px] w-full" />
                    </div>
                    <div className="lg:col-span-4 space-y-8">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );

    if (!matter) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white font-bold italic">Critical Error: Matter profile not found in system.</div>;

    const getLifecycleColor = (state: string) => {
        switch (state) {
            case 'submitted': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'reviewing': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'case_open': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'in_progress': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            case 'closed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-7xl mx-auto">
                <header className="mb-10">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-3xl font-black tracking-tight">{matter.title}</h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getLifecycleColor(matter.lifecycle_state)}`}>
                                    {matter.lifecycle_state?.replace('_', ' ')}
                                </span>
                                {matter.case_report?.intake_plan && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-2 ${matter.case_report.intake_plan === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        matter.case_report.intake_plan === 'standard' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                        <Clock size={12} /> {matter.case_report.intake_plan} Intake
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-400 flex items-center gap-2 text-sm">
                                <ShieldCheck className="w-4 h-4" />
                                File Number: <span className="text-indigo-400 font-bold tracking-widest">{matter.matter_number || 'PENDING'}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {isCaseManager && matter.lifecycle_state !== 'closed' && (
                                <>
                                    <button
                                        onClick={() => toggleChat.mutate(!matter.is_chat_enabled)}
                                        disabled={toggleChat.isPending}
                                        className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg ${
                                            matter.is_chat_enabled 
                                            ? 'bg-amber-600/20 border border-amber-600/30 text-amber-400 hover:bg-amber-600/30 shadow-amber-900/10' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20'
                                        }`}
                                    >
                                        {toggleChat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                        {matter.is_chat_enabled ? 'Disable Group Chat' : 'Enable Group Chat'}
                                    </button>

                                    <button
                                        onClick={() => setIsClosureModalOpen(true)}
                                        disabled={closeMatter.isPending}
                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                                    >
                                        {closeMatter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        Finalize Closure
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <MatterStageTracker
                    matterId={id!}
                    currentStageId={matter.current_pipeline_stage_id}
                    pipelineId={matter.pipeline_id}
                    isCaseManager={isCaseManager}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Case Overview</h3>
                            <p className="text-slate-300 leading-relaxed italic">"{matter.description || 'No description provided.'}"</p>
                        </div>

                        {/* Stage Specific Tasks & Workflow */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-all duration-1000" />
                            <MatterTasks
                                matterId={id!}
                                currentStageId={matter.current_stage_id}
                                isCaseManager={isCaseManager}
                            />
                        </div>

                        {/* Internal Legal Research & Notes Hub */}
                        <MatterNotesHub
                            matterId={id!}
                            isCaseManager={isCaseManager}
                        />

                        {/* Document Vault */}
                        <DocumentVault
                            matterId={id!}
                            caseReportId={matter?.case_report_id}
                            isCaseManager={isCaseManager}
                        />

                        {/* Court Sync Section */}
                        <CourtSync
                            matterId={id!}
                        />

                        {matter.lifecycle_state !== 'closed' && (
                            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Send className="w-24 h-24" /></div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                        {editingReportId ? 'Edit Draft Report' : 'Submit Progress Report'}
                                    </h3>
                                    {editingReportId && (
                                        <button
                                            onClick={() => {
                                                setEditingReportId(null);
                                                setReportTitle('');
                                                setReportContent('');
                                                setSelectedFiles([]);
                                            }}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                        >
                                            Cancel Editing
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <input type="text" placeholder="Report Title (e.g. Initial Evidence Review)" value={reportTitle} onChange={e => setReportTitle(e.target.value)} className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />

                                    <div className="bg-[#0F172A] rounded-xl overflow-hidden border border-white/5 quill-dark">
                                        <ReactQuill
                                            theme="snow"
                                            value={reportContent}
                                            onChange={setReportContent}
                                            placeholder="Provide detailed findings or updates for the client or file..."
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, false] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['link', 'clean']
                                                ],
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            {selectedFiles.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-xs font-bold">
                                                    <Paperclip size={12} /> <span className="max-w-[150px] truncate">{f.name}</span>
                                                    <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-white"><X size={14} /></button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors bg-white/5 px-4 py-2 rounded-xl border border-white/5 border-dashed"><Upload size={14} /> Attach Documents</button>
                                        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => { if (e.target.files) setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                                    </div>

                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative">
                                                    <input type="checkbox" checked={isFinalReport} onChange={e => setIsFinalReport(e.target.checked)} className="sr-only" />
                                                    <div className={`w-10 h-5 rounded-full transition-colors ${isFinalReport ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isFinalReport ? 'translate-x-5' : ''}`}></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Final Report</span>
                                            </label>

                                            {isCaseManager && (
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className="relative">
                                                        <input type="checkbox" checked={clientVisible} onChange={e => setClientVisible(e.target.checked)} className="sr-only" />
                                                        <div className={`w-10 h-5 rounded-full transition-colors ${clientVisible ? 'bg-emerald-600' : 'bg-slate-700'}`}></div>
                                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${clientVisible ? 'translate-x-5' : ''}`}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors flex items-center gap-2">{clientVisible ? <Eye size={14} className="text-emerald-400" /> : <EyeOff size={14} />} Client Visible</span>
                                                </label>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            {!isCaseManager && (
                                                <button
                                                    onClick={() => submitReport.mutate('draft')}
                                                    disabled={submitReport.isPending || isUploading || !reportTitle || !reportContent}
                                                    className="flex-1 sm:flex-none px-6 py-3 border border-white/10 hover:bg-white/5 text-slate-400 font-bold rounded-xl transition-all"
                                                >
                                                    Save as Draft
                                                </button>
                                            )}
                                            <button
                                                onClick={() => submitReport.mutate('under_review')}
                                                disabled={submitReport.isPending || isUploading || !reportTitle || !reportContent}
                                                className="flex-1 sm:flex-none px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                                            >
                                                {(submitReport.isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {isCaseManager ? 'Submit & Publish' : 'Submit for Review'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><History className="w-4 h-4" /> Activity Reports ({reports?.length || 0})</h3>

                            {/* ⚡ CM APPROVAL QUEUE — Only visible to Case Managers */}
                            {isCaseManager && reports && reports.filter((r: any) => r.status === 'under_review').length > 0 && (
                                <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5">
                                    <p className="text-xs font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <AlertCircle size={14} className="animate-pulse" />
                                        {reports.filter((r: any) => r.status === 'under_review').length} Report{reports.filter((r: any) => r.status === 'under_review').length > 1 ? 's' : ''} Awaiting Your Approval
                                    </p>
                                    <div className="space-y-3">
                                        {reports.filter((r: any) => r.status === 'under_review').map((report: any) => (
                                            <div key={report.id} className="flex flex-col bg-[#0F172A] border border-amber-500/10 rounded-xl p-4 gap-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-white truncate">{report.title}</p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            By <span className="text-indigo-400 font-bold">{report.author?.full_name || 'Associate'}</span>
                                                            {' '}&middot; {new Date(report.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setPreviewReport(report)}
                                                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl transition-all"
                                                            title="Quick Preview"
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => approveReport.mutate(report.id)}
                                                            disabled={approveReport.isPending || rejectReport.isPending}
                                                            className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/30"
                                                        >
                                                            {approveReport.isPending ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Please specify the reason for rejection or required changes:');
                                                                if (!reason) { toast('Please provide comments for the associate.', 'error'); return; }
                                                                rejectReport.mutate({ reportId: report.id, reason });
                                                            }}
                                                            disabled={approveReport.isPending || rejectReport.isPending}
                                                            className="shrink-0 px-4 py-2 bg-rose-600/10 hover:bg-rose-600 border border-rose-600/30 text-rose-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                        >
                                                            {rejectReport.isPending ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                                                            Return
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <textarea
                                                        placeholder="Provide feedback or list missing items for the associate..."
                                                        value={rejectionFeedback[report.id] || ''}
                                                        onChange={(e) => setRejectionFeedback(prev => ({ ...prev, [report.id]: e.target.value }))}
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:ring-1 focus:ring-rose-500/50 outline-none resize-none h-16 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Intake Evidence Panel */}
                            {intakeDocs && intakeDocs.length > 0 && (
                                <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 mb-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Original Intake Evidence
                                    </h3>
                                    <ul className="grid grid-cols-1 gap-3">
                                        {intakeDocs.map((doc: any) => (
                                            <li key={doc.id} className="flex items-center justify-between p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-xs font-bold text-white truncate max-w-[200px]">{doc.file_name}</p>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${doc.approval_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                    doc.approval_status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                }`}>
                                                                {doc.approval_status || 'pending'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wide">Client Upload</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleViewDocument(doc.file_path, doc.file_name)}
                                                        className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                                                        title="Preview Document"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(doc.file_path)}
                                                        className="p-2 text-slate-500 hover:text-white transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {reportsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 space-y-4">
                                            <div className="flex justify-between">
                                                <div className="space-y-2">
                                                    <Skeleton className="w-48 h-6" />
                                                    <Skeleton className="w-32 h-3" />
                                                </div>
                                                <Skeleton className="w-24 h-8" />
                                            </div>
                                            <Skeleton className="w-full h-24" />
                                        </div>
                                    ))}
                                </div>
                            ) : reports?.length === 0 ? <div className="bg-[#1E293B]/50 border border-white/5 rounded-2xl p-10 text-center text-slate-500"><AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" /> No reports submitted yet.</div> :
                                reports?.map((report: any) => (
                                    <div key={report.id} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-bold text-white text-lg">{report.title}</h4>
                                                    {report.client_visible ? <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><Eye size={8} /> CLIENT VISIBLE</span> : <span className="bg-slate-500/10 text-slate-400 border border-white/5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><EyeOff size={8} /> INTERNAL ONLY</span>}
                                                </div>
                                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                                    <span className="text-indigo-400 font-bold">{report.author?.full_name || 'System'}</span>
                                                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 uppercase font-bold">{report.author_role?.replace('_', ' ')}</span>
                                                    <span>•</span> <span>{new Date(report.created_at).toLocaleString()}</span>
                                                    {report.status === 'under_review' && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-black tracking-widest uppercase">Pending Review</span>
                                                    )}
                                                    {report.status === 'draft' && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-white/5 text-[9px] font-black tracking-widest uppercase">Draft</span>
                                                    )}
                                                    {report.status === 'rejected' && (
                                                        <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-black tracking-widest uppercase flex items-center gap-1"><AlertCircle size={10} /> Needs Revision</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {report.status === 'published' && (
                                                    <button
                                                        onClick={() => setPreviewReport(report)}
                                                        className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                    >
                                                        <Eye size={12} /> Preview
                                                    </button>
                                                )}
                                                {report.status === 'draft' && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingReportId(report.id);
                                                            setReportTitle(report.title);
                                                            setReportContent(report.content);
                                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                                        }}
                                                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Edit Draft
                                                    </button>
                                                )}
                                                {report.status === 'rejected' && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingReportId(report.id);
                                                            setReportTitle(report.title);
                                                            setReportContent(report.content);
                                                            window.scrollTo({ top: 300, behavior: 'smooth' });
                                                        }}
                                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Revise & Resubmit
                                                    </button>
                                                )}
                                                {report.status === 'under_review' && isCaseManager && (
                                                    <button
                                                        onClick={() => approveReport.mutate(report.id)}
                                                        disabled={approveReport.isPending}
                                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                    >
                                                        {approveReport.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve & Publish
                                                    </button>
                                                )}
                                                {report.is_final && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-emerald-500/10">FINAL</span>}
                                            </div>
                                        </div>
                                        {report.status === 'rejected' && report.rejection_reason && (
                                            <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mb-4 mt-2">
                                                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                    <MessageSquare size={10} /> Case Manager Feedback:
                                                </p>
                                                <p className="text-sm text-rose-200/80 italic leading-relaxed">"{report.rejection_reason}"</p>
                                            </div>
                                        )}
                                        <div className="text-slate-300 text-sm leading-relaxed prose prose-invert prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: report.content }} />
                                        {report.docs && report.docs.length > 0 && (
                                            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                                                {report.docs.map((d: any) => (
                                                    <div key={d.document.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 transition-all group/file">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10"><FileText size={16} /></div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-white group-hover/file:text-indigo-400 transition-colors truncate max-w-[150px]">{d.document.filename}</p>
                                                            <p className="text-[9px] text-slate-500 font-black uppercase">Legal Attachment</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => setSignModalDoc({ id: d.document.id, filename: d.document.filename })}
                                                                className="text-slate-600 hover:text-indigo-400 transition-colors group/sign"
                                                                title="Request Signature"
                                                            >
                                                                <PenTool size={14} className="group-hover/sign:scale-110 transition-transform" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleViewDocument(d.document.file_url, d.document.filename)}
                                                                className="text-slate-600 hover:text-indigo-400 transition-colors group/eye"
                                                                title="Preview"
                                                            >
                                                                <Eye size={14} className="group-hover/eye:scale-110 transition-transform" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(d.document.file_url)}
                                                                className="text-slate-600 hover:text-white transition-colors group/dl"
                                                                title="Download"
                                                            >
                                                                <Download size={14} className="group-hover/dl:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            }

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                        Page <span className="text-indigo-400">{page + 1}</span> of <span className="text-white">{totalPages}</span>
                                        <span className="ml-4 lowercase font-medium italic">({totalReports} total reports)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setPage(p => Math.max(0, p - 1));
                                                window.scrollTo({ top: 800, behavior: 'smooth' });
                                            }}
                                            disabled={page === 0}
                                            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPage(p => Math.min(totalPages - 1, p + 1));
                                                window.scrollTo({ top: 800, behavior: 'smooth' });
                                            }}
                                            disabled={page >= totalPages - 1}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/10"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div >

                    <div className="lg:col-span-4 space-y-8">
                        {/* Upcoming Deadlines & Sessions Widget */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 group">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Matter Milestones</span>
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full">{(meetings?.length || 0) + (matterDeadlines?.length || 0)} Upcoming</span>
                            </h3>

                            <div className="space-y-6">
                                {/* Deadlines Section */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Critical Deadlines</h4>
                                    {matterDeadlines?.length === 0 ? (
                                        <p className="text-[10px] text-slate-600 italic pl-1">No legal deadlines recorded.</p>
                                    ) : (
                                        matterDeadlines?.map((deadline: any) => {
                                            const isCritical = deadline.priority === 'critical' || deadline.priority === 'emergency';
                                            return (
                                                <div key={deadline.id} className={`p-4 rounded-2xl border ${isCritical ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'} transition-all hover:scale-[1.01]`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle size={12} className={isCritical ? 'text-rose-400' : 'text-amber-400'} />
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                                                                {deadline.category}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded uppercase font-bold">{deadline.status}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-white mb-1">{deadline.title}</p>
                                                    <p className={`text-xs font-bold ${isCritical ? 'text-rose-300' : 'text-amber-300'} flex items-center gap-2`}>
                                                        <Clock size={12} />
                                                        {format(new Date(deadline.deadline_date), 'MMM d, yyyy')}
                                                        {isCritical && <span className="animate-pulse">⚠️ Priority</span>}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="h-px bg-white/5 w-full" />

                                {/* Sessions Section */}
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Scheduled Sessions</h4>
                                    {meetings?.length === 0 ? (
                                        <p className="text-[10px] text-slate-600 italic pl-1">No coordination sessions scheduled yet.</p>
                                    ) : (
                                        meetings?.map((meeting: any) => (
                                            <div key={meeting.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${meeting.status === 'requested' ? 'bg-amber-500/10 text-amber-500' :
                                                        meeting.status === 'accepted' ? 'bg-blue-500/10 text-blue-400' :
                                                            meeting.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                'bg-red-500/10 text-red-500'
                                                        }`}>
                                                        {meeting.status}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{meeting.meeting_type}</span>
                                                </div>
                                                <p className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-500" />
                                                    {new Date(meeting.confirmed_start || meeting.proposed_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>

                                                {(isCaseManager || session?.user_id === meeting.lawyer_user_id) && meeting.status === 'requested' && (
                                                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                                        <button onClick={() => navigate('/internal/schedule')} className="flex-1 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-black uppercase rounded-lg transition-all text-center">Manage</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Matter Custody</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Case Manager (Supervisor)</label>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center font-bold text-slate-300 uppercase shrink-0">
                                            {matter.case_manager?.full_name?.charAt(0) || <Shield size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{matter.case_manager?.full_name || 'System Registry'}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Oversight & Review</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Associate Lawyer (Lead)</label>
                                    <div className="flex items-center gap-3 bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white uppercase shrink-0">
                                            {matter.assignee?.full_name?.charAt(0) || <UserPlus className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{matter.assignee?.full_name || 'Awaiting Selection'}</p>
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tight">Primary Counsel</p>
                                        </div>
                                    </div>
                                </div>
                                {isAdminManager && (
                                    <button
                                        onClick={() => navigate('/internal/matters')}
                                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        Modify Assignments
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Client Identity & Contact</h3>
                            <div className="bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/10 mb-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-indigo-600/20 rounded-full overflow-hidden flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                                        {matter.client?.avatar_url ? (
                                            <img src={matter.client.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <Briefcase className="w-6 h-6" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white leading-tight">{matter.client?.first_name} {matter.client?.last_name}</p>
                                        <p className="text-[10px] text-indigo-400 font-black uppercase mt-1">Verified External Reporter</p>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-3 border-t border-indigo-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Clock size={14} /></div>
                                        <p className="text-xs text-slate-300 font-medium">Verified Account</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Send size={14} /></div>
                                        <p className="text-xs text-white font-mono truncate">{matter.client?.email}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg text-slate-400"><UserPlus size={14} /></div>
                                        <p className="text-xs text-white font-mono">{matter.client?.phone || 'No phone provided'}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 italic text-center">Contact information is strictly for professional use within active matters.</p>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-indigo-400" /> Case Communication Bridge
                                </span>
                                {unreadChatCount > 0 && (
                                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse">
                                        {unreadChatCount} UNREAD
                                    </span>
                                )}
                            </h3>
                            <MatterChat matterId={id!} />
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><History className="w-4 h-4" /> Governance Timeline</h3>
                            <div className="space-y-6 relative ml-2">
                                <div className="absolute top-0 bottom-0 left-[7px] w-px bg-white/5"></div>
                                {timeline?.length === 0 ? <p className="text-[10px] text-slate-600 italic">History is initializing...</p> :
                                    timeline?.map((event: any, idx: number) => {
                                        const getEventIcon = (action: string) => {
                                            switch (action) {
                                                case 'case_accepted': return <CheckCircle2 className="w-3 h-3" />;
                                                case 'case_review_started': return <Search className="w-3 h-3" />;
                                                case 'case_assigned': return <UserPlus className="w-3 h-3" />;
                                                case 'report_submitted': return <FileText className="w-3 h-3" />;
                                                case 'final_report_submitted': return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
                                                case 'case_closed': return <ShieldCheck className="w-3 h-3" />;
                                                case 'lifecycle_transition': return <Briefcase className="w-3 h-3" />;
                                                case 'meeting_scheduled': return <Calendar className="w-3 h-3" />;
                                                case 'meeting_cancelled': return <X className="w-3 h-3 text-red-400" />;
                                                default: return <History className="w-3 h-3" />;
                                            }
                                        };
                                        const getEventColor = (action: string) => {
                                            if (action === 'case_closed') return 'bg-emerald-500';
                                            if (action === 'meeting_scheduled') return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
                                            if (action === 'meeting_cancelled') return 'bg-red-500';
                                            return idx === 0 ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700';
                                        };
                                        return (
                                            <div key={event.id} className="relative pl-7 group">
                                                <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-[#1E293B] z-10 flex items-center justify-center ${getEventColor(event.action)}`}><div className="text-white scale-[0.6]">{getEventIcon(event.action)}</div></div>
                                                <div><p className={`text-[11px] font-bold ${idx === 0 ? 'text-white' : 'text-slate-400'} uppercase tracking-tight group-hover:text-white transition-colors`}>{event.action.replace(/_/g, ' ')}</p><p className="text-[10px] text-slate-500 mt-0.5">{new Date(event.created_at).toLocaleDateString()} at {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    </div>
                </div >
            </main >

            {/* Document Viewer Modal */}
            {
                viewerOpen && viewingDocument && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-xl" onClick={() => setViewerOpen(false)} />
                        <div className="relative bg-[#1E293B] border border-white/10 w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-600/30">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{viewingDocument.name}</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">CaseBridge Secure Viewer</p>
                                    </div>
                                </div>
                                <button onClick={() => setViewerOpen(false)} className="bg-white/5 hover:bg-white/10 p-2 rounded-xl text-slate-500 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Document Content */}
                            <div className="flex-1 overflow-hidden bg-slate-900/50 relative">
                                <iframe
                                    src={viewingDocument.url}
                                    className="w-full h-full border-none"
                                    title={viewingDocument.name}
                                />
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/5 bg-gradient-to-r from-indigo-600/5 to-transparent flex justify-between items-center">
                                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] ml-2">Internal Compliance & Security Guaranteed</p>
                                <a
                                    href={viewingDocument.url}
                                    download={viewingDocument.name}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <Download size={14} />
                                    Download File
                                </a>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Client Report Preview */}
            {previewReport && (
                <ClientReportPreview
                    report={previewReport}
                    authorName={previewReport.author?.full_name || 'Counsel'}
                    matterTitle={matter?.title || 'Matter'}
                    attachments={previewReport.docs?.map((d: any) => ({ name: d.document.filename })) || []}
                    onClose={() => setPreviewReport(null)}
                />
            )}
            {/* 📝 Closure Modal */}
            {isClosureModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#1E293B] border border-white/10 rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                            <div className="flex items-center justify-between mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <ShieldCheck size={28} />
                                </div>
                                <button onClick={() => setIsClosureModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <h2 className="text-2xl font-black text-white">Finalize Case Closure</h2>
                            <p className="text-slate-400 text-sm mt-1">Provide a formal resolution summary for the client and records.</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-3 block">Resolution Summary</label>
                                <textarea
                                    value={closureSummary}
                                    onChange={(e) => setClosureSummary(e.target.value)}
                                    placeholder="Summarize the outcome, final actions taken, and any next steps for the client..."
                                    className="w-full bg-[#0F172A] border border-white/5 rounded-2xl p-4 text-sm text-slate-200 min-h-[150px] focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                                />
                                <p className="mt-3 text-[10px] text-slate-500 italic">This summary will be visible to the client in their secure portal.</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => setIsClosureModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-400 font-bold hover:text-white transition-colors"
                                >
                                    Back to File
                                </button>
                                <button
                                    onClick={() => closeMatter.mutate(closureSummary)}
                                    disabled={!closureSummary.trim() || closeMatter.isPending}
                                    className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    {closeMatter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Confirm & Lock Case
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sign Request Modal */}
            {signModalDoc && (
                <SignRequestModal
                    doc={signModalDoc}
                    matterId={id!}
                    onClose={() => setSignModalDoc(null)}
                    onSuccess={() => {
                        setSignModalDoc(null);
                        queryClient.invalidateQueries({ queryKey: ['matter_updates', id] });
                        queryClient.invalidateQueries({ queryKey: ['matter_documents_vault', id] });
                    }}
                />
            )}
        </div >
    );
}
