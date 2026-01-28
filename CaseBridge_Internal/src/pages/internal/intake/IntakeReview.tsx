import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { FileText, Download, CheckCircle, XCircle, ArrowLeft, Loader2, User, Briefcase } from 'lucide-react';
import InternalSidebar from '../../../components/layout/InternalSidebar';

export default function IntakeReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { session } = useInternalSession();
    const [report, setReport] = useState<any>(null);
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const isAdminOrCM = session?.role === 'admin_manager' || session?.role === 'case_manager';

    const [associates, setAssociates] = useState<any[]>([]);
    const [caseManagers, setCaseManagers] = useState<any[]>([]);
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [selectedCM, setSelectedCM] = useState('');

    useEffect(() => {
        if (session && !isAdminOrCM) {
            navigate('/auth/unauthorized');
            return;
        }
        fetchData();
        fetchStaff();
    }, [id, session]);

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
                .update({ status: 'under_review' })
                .eq('id', id);

            if (error) throw error;
            await fetchData(); // Refresh
        } catch (err: any) {
            alert("Error starting review: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAccept = async () => {
        if (!selectedAssociate) {
            alert("Please assign an Associate Lawyer before accepting the case.");
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
                        lifecycle_state: 'submitted',
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
                .update({ status: 'accepted' })
                .eq('id', report.id);

            if (uError) throw uError;

            alert("Case Accepted Successfully!");
            navigate('/intake');

        } catch (err: any) {
            alert("Error accepting case: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!confirm("Are you sure you want to reject this case? This cannot be undone.")) return;
        setProcessing(true);
        try {
            const { error } = await supabase
                .from('case_reports')
                .update({ status: 'rejected' })
                .eq('id', report.id);

            if (error) throw error;
            navigate('/intake');
        } catch (err: any) {
            alert("Error rejecting case: " + err.message);
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

    if (loading) return (
        <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
            <InternalSidebar />
            <div className="ml-64 p-10 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Case Intelligence...</p>
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
                                report.status === 'under_review' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    report.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
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

                        {report.status === 'under_review' && (
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
                        {report.status === 'under_review' && (
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
                        )}

                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Case Description</h3>
                            <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-base">
                                {report.description}
                            </p>
                        </div>

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
                                            <button
                                                onClick={() => handleDownload(doc.file_path)}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                title="Download File"
                                            >
                                                <Download size={18} />
                                            </button>
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
        </div>
    );
}
