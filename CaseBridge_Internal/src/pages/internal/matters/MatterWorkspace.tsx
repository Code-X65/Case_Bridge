import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Briefcase, FileText, Send, UserPlus,
    Eye, EyeOff, Calendar, Clock, BookOpen, Save as SaveIcon, Loader2 as LoaderIcon
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function MatterWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [reportTitle, setReportTitle] = useState('');
    const [reportContent, setReportContent] = useState('');
    const [isFinalReport, setIsFinalReport] = useState(false);
    const [clientVisible, setClientVisible] = useState(true); // Default to visible per request
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [internalNotes, setInternalNotes] = useState('');
    const [isNotesDirty, setIsNotesDirty] = useState(false);

    const isCaseManager = session?.role === 'case_manager' || session?.role === 'admin' || session?.role === 'admin_manager';

    // 1. Fetch Matter Details
    const { data: matter, isLoading: matterLoading } = useQuery({
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

    // Sync notes when data loads
    useEffect(() => {
        if (matter?.internal_notes) {
            setInternalNotes(matter.internal_notes);
        }
    }, [matter]);

    // 2. Fetch Reports
    const { data: reports } = useQuery({
        queryKey: ['matter_updates', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
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
                `)
                .eq('matter_id', id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

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

    // 5. Fetch Original Intake Documents
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
        mutationFn: async () => {
            setIsUploading(true);
            try {
                const { data: update, error: updateError } = await supabase
                    .from('matter_updates')
                    .insert({
                        matter_id: id,
                        author_id: session?.user_id,
                        author_role: isCaseManager ? 'case_manager' : 'associate_lawyer',
                        title: reportTitle,
                        content: reportContent,
                        client_visible: clientVisible,
                        is_final: isFinalReport
                    })
                    .select()
                    .single();

                if (updateError) throw updateError;

                if (selectedFiles.length > 0) {
                    for (const file of selectedFiles) {
                        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const filePath = `matters/${id}/updates/${update.id}/${sanitizedName}`;
                        await supabase.storage.from('case_documents').upload(filePath, file);

                        const { data: doc } = await supabase
                            .from('documents')
                            .insert({
                                filename: file.name,
                                file_url: filePath,
                                uploaded_by_user_id: session?.user_id,
                                uploaded_by_role: isCaseManager ? 'case_manager' : 'associate_lawyer'
                            })
                            .select().single();

                        if (doc) {
                            await supabase.from('report_documents').insert({
                                report_id: update.id,
                                document_id: doc.id,
                                client_visible: clientVisible
                            });
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
            alert('Report submitted successfully.');
        }
    });

    const closeMatter = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('transition_matter_lifecycle', {
                p_matter_id: id,
                p_new_state: 'closed'
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matter', id] });
            alert('Matter has been closed.');
        }
    });

    const saveInternalNotes = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('matters')
                .update({ internal_notes: internalNotes })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsNotesDirty(false);
            queryClient.invalidateQueries({ queryKey: ['matter', id] });
        }
    });

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage.from('case_documents').createSignedUrl(fileUrl, 60);
        if (data) window.open(data.signedUrl, '_blank');
    };

    if (matterLoading) return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
    );

    if (!matter) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Matter not found.</div>;

    const getLifecycleColor = (state: string) => {
        switch (state) {
            case 'submitted': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'under_review': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
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
                                <button
                                    onClick={() => { if (confirm('Are you sure you want to close this matter? This is a final action.')) closeMatter.mutate(); }}
                                    disabled={closeMatter.isPending}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                                >
                                    {closeMatter.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Confirm Closure
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Case Overview</h3>
                            <p className="text-slate-300 leading-relaxed italic">"{matter.description || 'No description provided.'}"</p>
                        </div>

                        {/* Internal Legal Notes (Rich Text) */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 relative">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-400" /> Internal Legal Research & Notes
                                </h3>
                                {isNotesDirty && (
                                    <button
                                        onClick={() => saveInternalNotes.mutate()}
                                        disabled={saveInternalNotes.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        {saveInternalNotes.isPending ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <SaveIcon className="w-3 h-3" />}
                                        Save Notes
                                    </button>
                                )}
                            </div>

                            <div className="bg-[#0F172A] rounded-xl overflow-hidden border border-white/5 quill-dark">
                                <ReactQuill
                                    theme="snow"
                                    value={internalNotes}
                                    onChange={(val) => {
                                        setInternalNotes(val);
                                        if (val !== matter.internal_notes) setIsNotesDirty(true);
                                    }}
                                    placeholder="Start drafting internal legal notes, research, or strategy here..."
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'clean']
                                        ],
                                    }}
                                />
                            </div>
                            <p className="mt-3 text-[10px] text-slate-500 italic flex items-center gap-2">
                                <Lock size={10} /> This content is strictly internal and never shared with the client.
                            </p>
                        </div>

                        {matter.lifecycle_state !== 'closed' && (
                            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><Send className="w-24 h-24" /></div>
                                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-400" /> Submit Progress Report
                                </h3>

                                <div className="space-y-4">
                                    <input type="text" placeholder="Report Title (e.g. Initial Evidence Review)" value={reportTitle} onChange={e => setReportTitle(e.target.value)} className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                                    <textarea placeholder="Provide detailed findings or updates..." value={reportContent} onChange={e => setReportContent(e.target.value)} className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-4 text-sm h-40 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none" />

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

                                        <button onClick={() => submitReport.mutate()} disabled={submitReport.isPending || isUploading || !reportTitle || !reportContent} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
                                            {(submitReport.isPending || isUploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><History className="w-4 h-4" /> Activity Reports ({reports?.length || 0})</h3>
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
                                                        <p className="text-xs font-bold text-white truncate max-w-[200px]">{doc.file_name}</p>
                                                        <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-wide">Client Upload</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(doc.file_path)}
                                                    className="p-2 text-slate-500 hover:text-white transition-colors shrink-0"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {reports?.length === 0 ? <div className="bg-[#1E293B]/50 border border-white/5 rounded-2xl p-10 text-center text-slate-500"><AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" /> No reports submitted yet.</div> :
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
                                                </p>
                                            </div>
                                            {report.is_final && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-emerald-500/10">FINAL</span>}
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">{report.content}</p>
                                        {report.docs && report.docs.length > 0 && (
                                            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
                                                {report.docs.map((d: any) => (
                                                    <button key={d.document.id} onClick={() => handleDownload(d.document.file_url)} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 transition-all group/file">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10"><FileText size={16} /></div>
                                                        <div className="text-left"><p className="text-xs font-bold text-white group-hover/file:text-indigo-400 transition-colors truncate max-w-[150px]">{d.document.filename}</p><p className="text-[9px] text-slate-500 font-black uppercase">Click to download</p></div>
                                                        <Download size={14} className="text-slate-600 group-hover/file:text-white transition-colors" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-8">
                        {/* Meetings Oversight Panel (Section 5) */}
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 group">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Scheduled Sessions</span>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{meetings?.length || 0} Total</span>
                            </h3>

                            <div className="space-y-4">
                                {meetings?.length === 0 ? (
                                    <p className="text-[10px] text-slate-600 italic">No coordination sessions scheduled yet.</p>
                                ) : (
                                    meetings?.map((meeting: any) => (
                                        <div key={meeting.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
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

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Matter Custody</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Assigned Associate</label>
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white uppercase">{matter.assignee?.full_name?.charAt(0) || <UserPlus className="w-5 h-5" />}</div>
                                        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-white truncate">{matter.assignee?.full_name || 'Unassigned'}</p><p className="text-[10px] text-slate-500 truncate">{matter.assignee?.email || 'Awaiting assignment'}</p></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Case Manager</label>
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 text-[10px] font-bold">{matter.case_manager?.full_name?.charAt(0) || 'CM'}</div><span className="text-sm text-slate-300 font-medium">{matter.case_manager?.full_name || 'System Admin'}</span></div>
                                </div>
                                {isCaseManager && <button onClick={() => navigate('/internal/case-manager/matters')} className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Reassign Case</button>}
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
                </div>
            </main>
        </div>
    );
}
