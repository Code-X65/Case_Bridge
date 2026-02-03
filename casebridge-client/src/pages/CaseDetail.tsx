import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Briefcase,
    FileText,
    Clock,
    Shield,
    Download,
    ArrowLeft,
    Bell,
    Calendar
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function CaseDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [matter, setMatter] = useState<any>(null);
    const [updates, setUpdates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCaseData = async () => {
            setLoading(true);

            // 1. Fetch Intake Report
            const { data: reportData } = await supabase
                .from('case_reports')
                .select('*')
                .eq('id', id)
                .single();

            if (reportData) {
                setReport(reportData);

                // 2. Fetch Matter if exists
                const { data: matterData } = await supabase
                    .from('matters')
                    .select(`
                        *,
                        assignee:assigned_associate ( full_name )
                    `)
                    .eq('case_report_id', id)
                    .maybeSingle();

                if (matterData) {
                    setMatter(matterData);

                    // 3. Fetch Matter Updates (Progress Reports)
                    const { data: updatesData } = await supabase
                        .from('matter_updates')
                        .select(`
                            *,
                            docs:report_documents(
                                document:document_id (
                                    id,
                                    filename,
                                    file_url,
                                    uploaded_at,
                                    uploaded_by_role
                                ),
                                client_visible
                            )
                        `)
                        .eq('matter_id', matterData.id)
                        .eq('client_visible', true)
                        .order('created_at', { ascending: false });

                    if (updatesData) setUpdates(updatesData);
                }
            }

            setLoading(false);
        };

        if (user && id) fetchCaseData();
    }, [user, id]);

    useGSAP(() => {
        if (!loading) {
            gsap.from('.case-section', {
                opacity: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, [loading]);

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) {
            window.open(data.signedUrl, '_blank');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'under_review': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'accepted': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'rejected': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'closed': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    if (loading) {
        return (
            <>
                <div className="flex justify-center py-20">
                    <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                </div>
            </>
        );
    }

    if (!report) {
        return (
            <>
                <div className="glass-card p-10 text-center">
                    <h2 className="text-xl font-bold mb-4">Case Not Found</h2>
                    <Link to="/cases" className="btn btn-primary">Back to My Cases</Link>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="mb-8">
                <Link to="/cases" className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 transition-colors font-bold text-sm">
                    <ArrowLeft size={16} />
                    Back to My Cases
                </Link>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 truncate">
                            {report.title}
                        </h1>
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] sm:text-sm font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <Briefcase size={16} className="text-blue-400 shrink-0" />
                                    {report.category}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock size={16} className="text-blue-400 shrink-0" />
                                    Filed {new Date(report.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            {matter?.assignee && (
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                    <Shield size={12} className="shrink-0" /> Assigned Counsel: {matter.assignee.full_name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {matter && ['under_review', 'in_progress'].includes(matter.lifecycle_state) && (
                            matter.assigned_associate ? (
                                <Link to={`/cases/${report.id}/schedule`} className="btn flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-500 text-white border-blue-500/20 flex items-center gap-2 shadow-lg shadow-blue-500/20 text-sm py-2 sm:px-4">
                                    <Calendar size={18} />
                                    Schedule
                                </Link>
                            ) : (
                                <button disabled className="btn flex-1 sm:flex-none justify-center bg-white/5 text-slate-500 border-white/5 flex items-center gap-2 cursor-not-allowed text-sm py-2 sm:px-4" title="Scheduling will be available once a lawyer is assigned">
                                    <Calendar size={18} />
                                    Awaiting Assignment
                                </button>
                            )
                        )}
                        <Link to={`/notifications?case=${matter?.id}`} className="btn flex-1 sm:flex-none justify-center bg-white/5 hover:bg-white/10 text-white border-white/10 flex items-center gap-2 text-sm py-2 sm:px-4">
                            <Bell size={18} />
                            Notifications
                        </Link>
                        <div className={`px-4 py-2 rounded-full border text-[10px] sm:text-xs font-black tracking-widest ${getStatusColor(matter?.lifecycle_state || report.status)} shadow-lg shadow-blue-500/10 flex-1 sm:flex-none text-center`}>
                            {(matter?.lifecycle_state || report.status).toUpperCase().replace('_', ' ')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Interaction History */}
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                    {/* Case Updates Timeline */}
                    <section className="case-section flex flex-col gap-4 sm:gap-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Case Interaction Timeline</h2>
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full uppercase">
                                {updates.length + 1} Milestones
                            </span>
                        </div>

                        {/* Initial Filing (Always First) */}
                        <div className="glass-card p-5 sm:p-8 border-l-4 border-l-blue-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Shield size={80} className="sm:w-[100px] sm:h-[100px]" />
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[9px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-400/5 px-2 py-0.5 rounded">Initial Submission</span>
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold">{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black mb-3 sm:mb-4">Case Intake Report</h3>
                            <p className="text-slate-300 leading-relaxed text-xs sm:text-sm whitespace-pre-wrap italic opacity-80">
                                {report.description}
                            </p>
                        </div>

                        {/* Professional Updates */}
                        {updates.map((update) => (
                            <div key={update.id} className="glass-card p-5 sm:p-8 border-l-4 border-l-emerald-500 relative group animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3 text-[9px] sm:text-[10px]">
                                        <span className="font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/5 px-2 py-0.5 rounded">
                                            {update.author_role.replace('_', ' ')} Update
                                        </span>
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold">{new Date(update.created_at).toLocaleDateString()}</span>
                                </div>

                                <h3 className="text-base sm:text-lg font-black text-white mb-2">{update.title || 'Professional Update'}</h3>
                                <div className="prose prose-invert max-w-none text-slate-400 leading-relaxed text-xs sm:text-sm mb-6">
                                    {update.content}
                                </div>

                                {/* Attached Documents for this update */}
                                {update.docs && update.docs.filter((d: any) => d.client_visible).length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-2 sm:gap-3">
                                        {update.docs.filter((d: any) => d.client_visible).map((d: any) => (
                                            <button
                                                key={d.document.id}
                                                onClick={() => handleDownload(d.document.file_url)}
                                                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-blue-500/20 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all text-[10px] sm:text-xs font-bold"
                                            >
                                                <FileText size={14} className="text-blue-400" />
                                                <span className="max-w-[120px] sm:max-w-none truncate">{d.document.filename}</span>
                                                <Download size={14} className="opacity-50 shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {updates.length === 0 && matter && (
                            <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center opacity-50">
                                <Clock size={40} className="mx-auto text-muted-foreground mb-4 opacity-20" />
                                <p className="text-muted-foreground italic text-xs sm:text-sm">Waiting for the next professional update from your legal team.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6 sm:space-y-8">
                    {/* Assigned Team */}
                    <section className="case-section glass-card p-6 sm:p-8 border-l-4 border-l-blue-500">
                        <h2 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Assigned Counsel</h2>
                        {matter ? (
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-xl shadow-blue-500/20">
                                    {matter.assignee?.full_name?.charAt(0) || 'L'}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-base sm:text-lg leading-tight truncate">{matter.assignee?.full_name || 'Assigned Lawyer'}</h4>
                                    <p className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Lead Associate</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 opacity-50">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground italic text-xl sm:text-2xl border border-white/10">
                                    ?
                                </div>
                                <div>
                                    <h4 className="font-bold text-base sm:text-lg">In Triage</h4>
                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Pending Counsel</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Support & Quick Links */}
                    <section className="case-section glass-card p-6 sm:p-8 bg-gradient-to-b from-white/5 to-transparent">
                        <h2 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Support</h2>
                        <div className="space-y-4">
                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                Need technical assistance or have an urgent question about your case?
                            </p>
                            <Link to="/notifications" className="btn btn-secondary w-full text-[11px] sm:text-xs py-3">
                                View Activity
                            </Link>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
