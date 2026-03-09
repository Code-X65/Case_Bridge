import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { FileText, Download, CheckCircle, XCircle, ArrowLeft, Loader2, User, Briefcase, AlertTriangle, ShieldCheck, Eye, X } from 'lucide-react';
import InternalSidebar from '../../../components/layout/InternalSidebar';
import { useToast } from '@/components/common/ToastService';
import { useConfirm } from '@/components/common/ConfirmDialogProvider';
import Skeleton from '@/components/ui/Skeleton';

export default function IntakeReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { session } = useInternalSession();
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const [report, setReport] = useState<any>(null);
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);

    const isAdminOrCM = session?.role === 'admin_manager' || session?.role === 'case_manager';

    const [associates, setAssociates] = useState<any[]>([]);
    const [caseManagers, setCaseManagers] = useState<any[]>([]);
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [selectedCM, setSelectedCM] = useState('');
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [checkingConflicts, setCheckingConflicts] = useState(false);

    useEffect(() => {
        if (session && !isAdminOrCM) {
            navigate('/auth/unauthorized');
            return;
        }
        fetchData();
        fetchStaff();
    }, [id, session]);

    useEffect(() => {
        if (report?.client) {
            runConflictCheck();
        }
    }, [report]);

    const runConflictCheck = async () => {
        if (!report?.client || !session?.firm_id) return;
        setCheckingConflicts(true);
        try {
            const fullName = `${report.client.first_name} ${report.client.last_name}`;
            const { data, error } = await supabase.rpc('search_conflicts', {
                search_query: fullName,
                firm_id_filter: session.firm_id
            });
            if (error) throw error;
            setConflicts(data || []);
        } catch (err) {
            console.error("Conflict check failed:", err);
        } finally {
            setCheckingConflicts(false);
        }
    };

    const fetchStaff = async () => {
        if (!session?.firm_id) return;

        // Fetch Staff
        const { data: staffData } = await supabase
            .from('user_firm_roles')
            .select(`
                user_id,
                role,
                profile:profiles ( id, full_name, email )
            `)
            .eq('firm_id', session.firm_id)
            .eq('status', 'active');

        if (staffData) {
            const acc = staffData.filter((s: any) => s.role === 'associate_lawyer').map((s: any) => s.profile);
            const cm = staffData.filter((s: any) => s.role === 'case_manager' || s.role === 'admin_manager').map((s: any) => s.profile);
            setAssociates(acc);
            setCaseManagers(cm);

            // Default CM to self if Case Manager
            if (session.role === 'case_manager') {
                setSelectedCM(session.user_id);
            }
        }
    };

    const handleStartReview = async () => {
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('case_reports')
                .update({ status: 'reviewing' })
                .eq('id', id);

            if (error) throw error;
            await fetchData(); // Refresh
        } catch (err: any) {
            toast("Error starting review: " + err.message, "error");
        } finally {
            setProcessing(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedAssociate) {
            toast("Please assign an Associate Lawyer before accepting the case.", "error");
            return;
        }

        setProcessing(true);
        try {
            // 1. Check if a matter already exists for this report (Avoid 409)
            const { data: existingMatter } = await supabase
                .from('matters')
                .select('id')
                .eq('case_report_id', report.id)
                .maybeSingle();

            let matterId = existingMatter?.id;

            if (!matterId) {
                // 2. Determine Firm ID
                let firmId = report.preferred_firm_id || session!.firm_id;

                // 3. Create Matter
                const { data: matter, error: mError } = await supabase
                    .from('matters')
                    .insert({
                        firm_id: firmId,
                        client_id: report.client_id,
                        case_report_id: report.id,
                        title: report.title,
                        description: report.description,
                        adverse_parties: report.adverse_parties,
                        lifecycle_state: 'case_open',
                        created_by: session!.user_id,
                        assigned_associate: selectedAssociate,
                        assigned_case_manager: selectedCM || null
                    })
                    .select()
                    .single();

                if (mError) throw mError;
                matterId = matter.id;

                // 4. Create Assignments Registry (Immutable Record)
                const assignments = [
                    {
                        target_id: matterId,
                        target_type: 'matter',
                        assigned_to_user_id: selectedAssociate,
                        assigned_role: 'associate_lawyer',
                        firm_id: firmId
                    }
                ];

                if (selectedCM) {
                    assignments.push({
                        target_id: matterId,
                        target_type: 'matter',
                        assigned_to_user_id: selectedCM,
                        assigned_role: 'case_manager',
                        firm_id: firmId
                    });
                }

                const { error: aError } = await supabase
                    .from('case_assignments')
                    .insert(assignments);

                if (aError) throw aError;
            }

            // 5. Finalize Report Status (Always do this to ensure sync)
            const { error: uError } = await supabase
                .from('case_reports')
                .update({ status: 'case_open' })
                .eq('id', report.id);

            if (uError) throw uError;

            toast("Case Accepted Successfully!", "success");
            navigate('/intake');

        } catch (err: any) {
            toast("Error accepting case: " + err.message, "error");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!(await confirm({ title: "Reject Case?", message: "Are you sure you want to reject this case? This cannot be undone.", isDangerous: true, confirmText: 'Reject' }))) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('case_reports')
                .update({ status: 'rejected' })
                .eq('id', report.id);

            if (error) throw error;
            navigate('/intake');
        } catch (err: any) {
            toast("Error rejecting case: " + err.message, "error");
        } finally {
            setProcessing(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const { data: r, error: rError } = await supabase
            .from('case_reports')
            .select(`
                *,
                client:client_id (*)
            `)
            .eq('id', id)
            .single();

        if (rError) {
            console.error(rError);
            setLoading(false);
            return;
        }
        setReport(r);

        const { data: d } = await supabase
            .from('case_report_documents')
            .select('*')
            .eq('case_report_id', id);

        if (d) setDocs(d);
        setLoading(false);
    };

    const handleDownload = async (path: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(path, 60);

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

    if (loading) return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />
            <div className="ml-64 p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                <button className="flex items-center gap-2 text-transparent mb-6 font-bold text-sm select-none">
                    <ArrowLeft size={16} /> Back
                </button>
                <Skeleton className="h-32 w-full" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                    <div className="space-y-8">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </div>
        </div>
    );

    if (!report) return (
        <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
            <InternalSidebar />
            <div className="ml-64 p-10">Case Report not found.</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <div className="ml-64 p-10 max-w-6xl mx-auto">
                <button onClick={() => navigate('/intake')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors font-bold text-sm">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                {/* Header Actions */}
                <div className="bg-[#1E293B] border border-white/10 rounded-2xl shadow-xl p-8 mb-8 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <h1 className="text-3xl font-black text-white tracking-tight">{report.title}</h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${report.status === 'submitted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                report.status === 'reviewing' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    report.status === 'case_open' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                {report.status}
                            </span>
                        </div>
                        <p className="text-slate-400 flex items-center gap-3 text-sm font-medium">
                            <span className="text-white flex items-center gap-1"><Briefcase size={14} /> {report.category}</span>
                            <span className="text-slate-600">•</span>
                            <span>Submitted {new Date(report.created_at).toLocaleDateString()}</span>
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {report.status === 'submitted' && (
                            <button
                                onClick={handleStartReview}
                                disabled={processing}
                                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 font-bold shadow-lg shadow-blue-600/20 transition-all font-black uppercase italic text-xs tracking-widest"
                            >
                                Start Internal Review
                            </button>
                        )}

                        {report.status === 'reviewing' && (
                            <div className="flex gap-4">
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-6 py-3 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/10 font-bold transition-all"
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button
                                    onClick={handleAccept}
                                    disabled={processing || !selectedAssociate}
                                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-bold shadow-lg shadow-indigo-600/20 transition-all font-black uppercase italic text-xs tracking-widest disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                    Accept & Create Matter
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-6">
                            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 border-l-4 border-l-indigo-500">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <User size={14} /> Critical: Case Assignment
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Associate Lawyer *</label>
                                        <select
                                            value={selectedAssociate}
                                            onChange={e => setSelectedAssociate(e.target.value)}
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Select Associate...</option>
                                            {associates.map(a => (
                                                <option key={a.id} value={a.id}>{a.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Case Manager</label>
                                        <select
                                            value={selectedCM}
                                            onChange={e => setSelectedCM(e.target.value)}
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Select Case Manager...</option>
                                            {caseManagers.map(c => (
                                                <option key={c.id} value={c.id}>{c.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Conflict of Interest Check */}
                            <div className={`bg-[#1E293B] border rounded-2xl p-8 border-l-4 ${conflicts.length > 0 ? 'border-amber-500 border-white/10' : 'border-emerald-500 border-white/10'}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <ShieldCheck size={14} /> Ethical Conflict Search
                                    </h3>
                                    {checkingConflicts ? (
                                        <Loader2 size={14} className="animate-spin text-indigo-500" />
                                    ) : (
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${conflicts.length > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {conflicts.length} Potential Matches
                                        </span>
                                    )}
                                </div>

                                {conflicts.length === 0 ? (
                                    <div className="flex items-center gap-3 text-emerald-400/60 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                        <CheckCircle size={16} />
                                        <p className="text-sm font-bold">Clear: No direct conflicts found for this client identity.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                                            <AlertTriangle size={16} />
                                            <p className="text-xs font-black uppercase tracking-wider">Warning: Review matches before acceptance</p>
                                        </div>
                                        {conflicts.map((c, i) => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{c.match_name}</p>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black">{c.match_type} {c.matter_title ? `in ${c.matter_title}` : ''}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-indigo-400 text-sm font-black italic">{Math.round(c.similarity_score * 100)}% Match</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Case Description</h3>
                            <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-base">
                                {report.description}
                            </p>
                        </div>

                        {report.adverse_parties && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8">
                                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-4 border-b border-amber-500/10 pb-2">Identified Adverse Parties</h3>
                                <p className="text-slate-300 font-bold text-lg">
                                    {report.adverse_parties}
                                </p>
                            </div>
                        )}

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Documents ({docs.length})</h3>
                            {docs.length === 0 ? (
                                <p className="text-slate-500 italic">No documents uploaded.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {docs.map(doc => (
                                        <li key={doc.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 group-hover:text-indigo-300">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white group-hover:text-indigo-200">{doc.file_name}</p>
                                                    <p className="text-xs text-slate-500">{(doc.file_size / 1024).toFixed(1)} KB</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewDocument(doc.file_path, doc.file_name)}
                                                    className="p-2 text-slate-400 hover:text-indigo-400 rounded-lg transition-colors"
                                                    title="Preview Document"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(doc.file_path)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    title="Download File"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Client Identity</h3>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 border border-white/10">
                                    <User size={24} />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-lg">{report.client?.first_name} {report.client?.last_name}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-wide">Verified</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 text-sm border-t border-white/5 pt-4">
                                <div>
                                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Email</label>
                                    <p className="text-white font-medium">{report.client?.email}</p>
                                </div>
                                <div>
                                    <label className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Phone</label>
                                    <p className="text-white font-medium">{report.client?.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Firm Context</h3>
                            {report.preferred_firm_id ? (
                                <div className="p-4 bg-indigo-500/10 text-indigo-300 rounded-xl text-sm border border-indigo-500/20">
                                    <strong className="block mb-1 text-indigo-200 uppercase text-xs tracking-wider">Direct Preference</strong>
                                    This client specifically requested your firm during intake.
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-xl text-sm border border-yellow-500/20">
                                    <strong className="block mb-1 text-yellow-400 uppercase text-xs tracking-wider">General Pool</strong>
                                    This case is from the general intake pool and is open to the network.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewerOpen && viewingDocument && (
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
            )}
        </div>
    );
}
