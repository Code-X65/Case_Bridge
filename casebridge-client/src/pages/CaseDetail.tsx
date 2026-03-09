import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Briefcase,
    FileText,
    Clock,
    Download,
    ArrowLeft,
    Bell,
    Calendar,
    Shield,
    ChevronRight,
    Loader2,
    PenTool,
    X,
    Eye,
    Star,
    Lock
} from 'lucide-react';
import ClientStageTracker from '../components/cases/ClientStageTracker';
import ClientTaskTracker from '../components/cases/ClientTaskTracker';
import ReviewModal from '../components/matters/ReviewModal';
import CaseGroupChat from '../components/cases/CaseGroupChat';
import CaseAuditHistory from '../components/cases/CaseAuditHistory';
import ReportCommentThread from '../components/cases/ReportCommentThread';

export default function CaseDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [matter, setMatter] = useState<any>(null);
    const [updates, setUpdates] = useState<any[]>([]);
    const [pendingSignatures, setPendingSignatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<{ url: string; name: string } | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [activeTab, setActiveTab] = useState<'timeline' | 'messages' | 'audit'>('timeline');
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        if (!id) return;
        const { data, error } = await supabase.rpc('get_unread_chat_count', { p_matter_id: id });
        if (!error) setUnreadCount(data || 0);
    };

    useEffect(() => {
        const fetchCaseData = async () => {
            setLoading(true);

            // 1. First, try to fetch as a Matter (more authoritative if it exists)
            const { data: matterData } = await supabase
                .from('matters')
                .select(`
                    *,
                    report:case_report_id ( * ),
                    assignee:assigned_associate ( full_name )
                `)
                .eq('id', id)
                .maybeSingle();

            if (matterData) {
                setMatter(matterData);
                setReport(matterData.report);
                
                await fetchUnreadCount();

                // 2. Fetch Matter Updates (Progress Reports)
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

                // 3. Fetch pending signature requests for this matter
                const { data: sigData } = await supabase
                    .from('signature_requests')
                    .select('id, message, status, created_at, document:document_id(id, filename)')
                    .eq('matter_id', matterData.id)
                    .eq('client_id', user?.id)
                    .eq('status', 'pending');

                setPendingSignatures(sigData || []);

                // 4. Check if reviewed
                const { data: reviewData } = await supabase
                    .from('matter_reviews')
                    .select('id')
                    .eq('matter_id', matterData.id)
                    .maybeSingle();
                setHasReviewed(!!reviewData);

            } else {
                // 3. Fallback: Try to fetch as a standalone Case Report
                const { data: reportData } = await supabase
                    .from('case_reports')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (reportData) {
                    setReport(reportData);
                }
            }

            setLoading(false);
        };

        if (user && id) {
            fetchCaseData();

            // Real-time subscription for unread badge
            const channel = supabase
                .channel(`unread_badge:${id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'matter_messages',
                        filter: `matter_id=eq.${id}`
                    },
                    (payload) => {
                        if (payload.new.sender_id !== user.id) {
                            fetchUnreadCount();
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
                        fetchUnreadCount();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user, id]);

    // Clear unread count when switching to messages tab
    useEffect(() => {
        if (activeTab === 'messages' && unreadCount > 0) {
            setUnreadCount(0);
        }
    }, [activeTab, unreadCount]);

    const handleDownload = async (fileUrl: string) => {
        const { data } = await supabase.storage
            .from('case_documents')
            .createSignedUrl(fileUrl, 60);

        if (data) {
            window.open(data.signedUrl, '_blank');
        }
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

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'submitted':
                return 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_10px_rgba(96,165,250,0.1)]';
            case 'reviewing':
                return 'text-orange-400 bg-orange-400/10 border-orange-400/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]';
            case 'case_open':
                return 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]';
            case 'in_progress':
                return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]';
            case 'closed':
                return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.2)]';
            default:
                return 'text-muted-foreground bg-input border-border shadow-sm';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="max-w-xl mx-auto py-20 animate-fade-in relative z-10 px-4">
                <div className="bg-card/50 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center py-16 px-6 text-center shadow-neumorph-inset">
                    <div className="w-16 h-16 rounded-full bg-input border border-border flex items-center justify-center mb-6 shadow-sm">
                        <FileText size={28} className="text-muted-foreground/50" />
                    </div>
                    <h2 className="text-2xl font-black mb-3 text-foreground">Case Not Found</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        The case report you are looking for does not exist or you do not have permission to view it.
                    </p>
                    <Link to="/cases" className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-[var(--radius-neumorph)] uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:bg-primary/90 transition-all flex items-center gap-2">
                        <ArrowLeft size={16} /> Back to My Cases
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in relative max-w-5xl mx-auto pb-10">
            {/* Ambient Background Blur */}
            <div className="absolute top-[0%] left-[10%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">
                <div className="mb-8">
                    <Link to="/cases" className="text-muted-foreground hover:text-primary flex items-center gap-2 mb-6 transition-colors font-bold text-xs uppercase tracking-widest group w-max">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Back to My Cases
                    </Link>

                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                        <div className="min-w-0">
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground bg-clip-text">
                                {report.title}
                            </h1>
                            <div className="mt-4 flex flex-col gap-3">
                                <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-2">
                                        <Briefcase size={14} className="text-primary shrink-0" />
                                        {(report.category || 'General').replace(/_/g, ' ')}
                                    </span>
                                    <span className="hidden xs:inline text-border">•</span>
                                    <span className="flex items-center gap-2">
                                        <Clock size={14} className="text-primary shrink-0 opacity-70" />
                                        Filed {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className={`px-5 py-2.5 rounded-full border text-[10px] sm:text-xs font-black tracking-widest uppercase flex-1 sm:flex-none text-center ${getStatusColor(matter?.lifecycle_state || report.status)}`}>
                                {(matter?.lifecycle_state || report.status || 'UNKNOWN').replace(/_/g, ' ')}
                            </div>

                            <Link to={`/notifications?case=${matter?.id}`} className="px-5 py-2.5 bg-input border border-border hover:border-primary/50 text-foreground hover:text-primary rounded-full flex items-center justify-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-sm">
                                <Bell size={16} />
                                Alerts
                            </Link>

                            {matter?.lifecycle_state === 'closed' && !hasReviewed && (
                                <button
                                    onClick={() => setIsReviewModalOpen(true)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-full shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest active:scale-95 animate-pulse hover:animate-none"
                                >
                                    <Star size={16} /> Share Experience
                                </button>
                            )}

                            {matter && ['submitted', 'reviewing', 'case_open', 'in_progress'].includes(matter.lifecycle_state) && (
                                matter.assigned_associate ? (
                                    <Link to={`/cases/${report.id}/schedule`} className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] transition-all flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest active:scale-95">
                                        <Calendar size={16} /> Request Meeting
                                    </Link>
                                ) : (
                                    <button disabled className="px-6 py-2.5 bg-input border border-border text-muted-foreground font-bold rounded-full shadow-inner flex items-center justify-center gap-2 text-[10px] sm:text-xs uppercase tracking-widest cursor-not-allowed opacity-70">
                                        <Calendar size={16} /> Awaiting Assignment
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {matter && matter.pipeline_id && (
                    <div className="mb-10 lg:mb-12">
                        <ClientStageTracker
                            matterId={matter.id}
                            currentStageId={matter.current_stage_id}
                            pipelineId={matter.pipeline_id}
                        />
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 mb-8 bg-input/50 p-1.5 rounded-[1.5rem] border border-border w-max mx-auto sm:mx-0">
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'timeline' 
                            ? 'bg-primary text-primary-foreground shadow-neumorph' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Timeline
                    </button>
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 relative ${
                            activeTab === 'messages' 
                            ? 'bg-primary text-primary-foreground shadow-neumorph' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Messages
                        {matter && !matter.is_chat_enabled && <Lock size={10} className="opacity-50" />}
                        {unreadCount > 0 && activeTab !== 'messages' && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-bounce">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'audit' 
                            ? 'bg-primary text-primary-foreground shadow-neumorph' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        History
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8 sm:space-y-10">
                        {activeTab === 'timeline' && (
                            <>
                                {/* 🏆 Case Resolution Summary (Pinned if Closed) */}
                                {matter?.lifecycle_state === 'closed' && (
                                    <section className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden shadow-lg shadow-emerald-500/5 animate-in slide-in-from-top-4 duration-500">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                                            <Shield size={180} className="text-emerald-500" />
                                        </div>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm transition-all duration-700 hover:scale-110">
                                                <Shield size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Case Resolution</h2>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Officially Closed</span>
                                                    <span className="h-1 w-1 rounded-full bg-border"></span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{new Date(matter.closed_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-card border border-border/50 rounded-3xl p-6 sm:p-8 shadow-neumorph-inset relative z-10">
                                            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-wrap italic">
                                                "{matter.resolution_summary || 'Your case has been successfully closed. Thank you for choosing CaseBridge.'}"
                                            </p>
                                        </div>
                                    </section>
                                )}

                                <section className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between px-2">
                                        <h2 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Clock size={14} className="text-primary" /> Timeline
                                        </h2>
                                        <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full uppercase tracking-widest">
                                            {updates.length + 1} Milestones
                                        </span>
                                    </div>

                                    {/* Initial Filing (Always First) */}
                                    <div className="bg-card border border-border shadow-sm hover:shadow-neumorph rounded-[2rem] p-6 sm:p-10 border-l-4 border-l-primary relative overflow-hidden transition-all duration-300">
                                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                                            <Shield size={100} className="sm:w-[120px] sm:h-[120px] text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between mb-6 relative z-10">
                                            <span className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">Initial Submission</span>
                                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl sm:text-2xl font-black mb-4 text-foreground relative z-10 w-3/4">Case Intake Report</h3>
                                        <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap italic/90 relative z-10">
                                            "{report.description}"
                                        </p>
                                    </div>

                                    {/* Professional Updates */}
                                    {updates.map((update) => (
                                        <div key={update.id} className="bg-card border border-border shadow-sm hover:shadow-neumorph rounded-[2rem] p-6 sm:p-10 border-l-4 border-l-emerald-500 relative group animate-in fade-in duration-500 transition-all">
                                            <div className="flex items-center justify-between mb-6 relative z-10">
                                                <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 border border-emerald-400/20 px-3 py-1 rounded-full">
                                                    {(update.author_role.charAt(0).toUpperCase() + update.author_role.slice(1)).replace('_', ' ')} Update
                                                </span>
                                                <span className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{new Date(update.created_at).toLocaleDateString()}</span>
                                            </div>

                                            <h3 className="text-lg sm:text-xl font-black text-foreground mb-4 relative z-10">{update.title || 'Professional Update'}</h3>
                                            <div
                                                className="text-muted-foreground leading-relaxed text-sm mb-6 relative z-10"
                                                dangerouslySetInnerHTML={{ __html: update.content }}
                                            />

                                            {/* Attached Documents for this update */}
                                            {update.docs && update.docs.filter((d: any) => d.client_visible).length > 0 && (
                                                <div className="mt-8 pt-6 border-t border-border flex flex-wrap gap-3 relative z-10">
                                                    {update.docs.filter((d: any) => d.client_visible).map((d: any) => (
                                                        <div key={d.document.id} className="flex items-center gap-3 bg-input border border-border hover:border-primary/50 rounded-[var(--radius-neumorph)] transition-all shadow-sm hover:shadow-[0_0_10px_rgba(201,162,77,0.15)] group/btn overflow-hidden">
                                                            <div className="flex items-center gap-3 px-4 py-2.5 flex-1 min-w-0">
                                                                <FileText size={16} className="text-primary group-hover/btn:scale-110 transition-transform" />
                                                                <span className="text-[10px] sm:text-xs font-bold text-foreground max-w-[150px] sm:max-w-[200px] truncate">{d.document.filename}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 pr-3">
                                                                <button
                                                                    onClick={() => handleViewDocument(d.document.file_url, d.document.filename)}
                                                                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                                                    title="Preview"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(d.document.file_url)}
                                                                    className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                                                                    title="Download"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Localized Discussion */}
                                            <ReportCommentThread updateId={update.id} />
                                        </div>
                                    ))}

                                    {updates.length === 0 && matter && (
                                        <div className="bg-input/30 border border-dashed border-border rounded-[2rem] p-10 sm:p-16 text-center shadow-inner">
                                            <Clock size={48} className="mx-auto text-muted-foreground/30 mb-6" />
                                            <p className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">Awaiting Updates</p>
                                            <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">We are reviewing your submission. Your legal team will post the first update here soon.</p>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}

                        {activeTab === 'messages' && (
                            <section className="animate-in slide-in-from-right-4 duration-500">
                                {matter ? (
                                    <CaseGroupChat matterId={matter.id} />
                                ) : (
                                    <div className="bg-input/30 border border-dashed border-border rounded-[2rem] p-10 sm:p-16 text-center shadow-inner">
                                        <Shield size={48} className="mx-auto text-muted-foreground/30 mb-6" />
                                        <p className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">Messenger Unavailable</p>
                                        <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">Group chat is activated once a case is formally accepted by our legal team.</p>
                                    </div>
                                )}
                            </section>
                        )}

                        {activeTab === 'audit' && (
                            <section className="animate-in slide-in-from-right-4 duration-500">
                                {matter ? (
                                    <CaseAuditHistory matterId={matter.id} />
                                ) : (
                                    <div className="bg-input/30 border border-dashed border-border rounded-[2rem] p-10 sm:p-16 text-center shadow-inner">
                                        <Clock size={48} className="mx-auto text-muted-foreground/30 mb-6" />
                                        <p className="text-foreground font-bold uppercase tracking-widest text-xs mb-2">History Unavailable</p>
                                        <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">Case tracking begins once your report enters the legal intake process.</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6 sm:space-y-8">
                        {/* Assigned Team */}
                        <section className="bg-card border border-border shadow-sm rounded-[2rem] p-6 sm:p-8 relative overflow-hidden">
                            <h2 className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                                <Shield size={14} className="text-primary" /> Assigned Counsel
                            </h2>
                            {matter ? (
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center text-primary font-black text-xl sm:text-2xl shadow-[0_0_15px_rgba(201,162,77,0.2)] shrink-0">
                                        {matter.assignee?.full_name?.charAt(0).toUpperCase() || 'L'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-base sm:text-lg leading-tight truncate text-foreground mb-1">{matter.assignee?.full_name || 'Assigned Lawyer'}</h4>
                                        <p className="text-[9px] sm:text-[10px] text-primary/80 font-bold uppercase tracking-widest">Lead Counsel</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-4 opacity-70 relative z-10">
                                    <div className="w-14 h-14 bg-input border border-border rounded-full flex items-center justify-center text-muted-foreground text-xl shrink-0 shadow-inner">
                                        ?
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-base sm:text-lg text-foreground mb-1">In Triage</h4>
                                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pending Assignment</p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ✍️ Pending Signature Requests */}
                        {pendingSignatures.length > 0 && (
                            <section className="bg-card border border-primary/30 shadow-[0_0_20px_rgba(201,162,77,0.08)] rounded-[2rem] p-6 sm:p-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                                <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                                    <PenTool size={14} className="animate-pulse" /> Action Required — Sign Documents
                                </h2>
                                <div className="space-y-3">
                                    {pendingSignatures.map((req) => (
                                        <Link
                                            key={req.id}
                                            to={`/sign/${req.id}`}
                                            className="flex items-center gap-3 w-full p-4 bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 rounded-[var(--radius-neumorph)] transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                                                <FileText size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{req.document?.filename || 'Document'}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Tap to review &amp; sign</p>
                                            </div>
                                            <ChevronRight size={16} className="text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Tasks Tracking */}
                        {matter && (
                            <ClientTaskTracker
                                matterId={matter.id}
                                currentStageId={matter.current_stage_id}
                            />
                        )}

                        {/* Support & Quick Links */}
                        <section className="bg-card border border-border shadow-sm rounded-[2rem] p-6 sm:p-8 bg-gradient-to-b from-primary/5 to-transparent relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-[30px] -z-10 translate-x-1/2 -translate-y-1/2"></div>
                            <h2 className="text-[10px] sm:text-xs font-black text-foreground uppercase tracking-[0.2em] mb-6 relative z-10">Support</h2>
                            <div className="space-y-5 relative z-10">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Questions about your case strategy or need to upload physical documents?
                                </p>
                                <Link to="/notifications" className="w-full py-3.5 bg-input hover:bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-[0_0_10px_rgba(201,162,77,0.15)] flex justify-center items-center gap-2 group">
                                    Message Team <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform text-primary" />
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Premium Document Viewer Modal */}
            {viewerOpen && viewingDocument && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-xl" onClick={() => setViewerOpen(false)} />

                    <div className="relative bg-card border border-border w-full max-w-6xl h-full max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-neumorph flex flex-col animate-in zoom-in-95 duration-500">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 sm:p-8 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                                    <FileText size={28} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg sm:text-xl font-black text-foreground truncate max-w-[200px] sm:max-w-md">{viewingDocument.name}</h3>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Secure Preview Portal</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewerOpen(false)}
                                className="bg-input hover:bg-card p-3 rounded-2xl text-muted-foreground hover:text-foreground transition-all shadow-sm hover:shadow-neumorph border border-border active:scale-95"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Document Content */}
                        <div className="flex-1 overflow-hidden bg-input/20 relative m-2 sm:m-4 rounded-[1.5rem] border border-border/50">
                            <iframe
                                src={viewingDocument.url}
                                className="w-full h-full border-none"
                                title={viewingDocument.name}
                            />
                        </div>

                        {/* Footer */}
                        <div className="p-6 sm:p-8 border-t border-border bg-gradient-to-l from-primary/5 to-transparent flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Shield size={14} className="text-primary/70" />
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center sm:text-left">End-to-End Encryption • CaseBridge Secure Access</p>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => setViewerOpen(false)}
                                    className="flex-1 sm:flex-none px-6 py-3 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => handleDownload(viewingDocument.url)}
                                    className="flex-1 sm:flex-none px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl shadow-[0_0_20px_rgba(201,162,77,0.3)] uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
                                >
                                    <Download size={16} />
                                    Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                matterId={matter?.id}
                onSuccess={() => setHasReviewed(true)}
            />
        </div>
    );
}
