import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FileText, Clock, PlusCircle, ChevronRight, Loader2 } from 'lucide-react';

export default function MyCases() {
    const { user } = useAuth();
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCases = async () => {
            if (!user) return;
            // Fetch both case_reports and matters for the client
            const [{ data: caseReports }, { data: matters }] = await Promise.all([
                supabase
                    .from('case_reports')
                    .select('*')
                    .eq('client_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('matters')
                    .select('id, title, status:lifecycle_state, created_at, case_report_id, report:case_reports(category), pipeline:pipeline_id(practice_area)')
                    .eq('client_id', user.id)
                    .order('created_at', { ascending: false })
            ]);

            // 1. Identify which reports are now matters
            const convertedReportIds = new Set(matters?.map(m => m.case_report_id).filter(Boolean));

            // 2. Filter out duplicate reports
            const uniqueReports = (caseReports || []).filter(r => !convertedReportIds.has(r.id));

            // 3. Combine and sort
            const allCases = [...uniqueReports, ...(matters || [])].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setCases(allCases);
            setLoading(false);
        };

        fetchCases();
    }, [user]);

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

    const getStatusLabel = (status: string) => {
        if (!status) return 'UNKNOWN';
        return status.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <div className="animate-fade-in relative max-w-5xl mx-auto pb-10">
            {/* Ambient Background Blur */}
            <div className="absolute top-[0%] left-[10%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-2">My Cases</h1>
                        <p className="text-muted-foreground text-sm sm:text-base">Track the status of your reported cases and active matters.</p>
                    </div>
                    <Link
                        to="/cases/new"
                        className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[var(--radius-neumorph)] flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] hover:-translate-y-0.5 active:scale-95 group"
                    >
                        <PlusCircle size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        Report New Case
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </div>
                ) : cases.length === 0 ? (
                    <div className="bg-card/50 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center py-16 sm:py-24 shadow-neumorph-inset relative overflow-hidden">
                        <div className="w-20 h-20 rounded-full bg-input border border-border flex items-center justify-center mb-6 shadow-sm">
                            <FileText size={36} className="text-muted-foreground/50" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-3 text-foreground text-center px-4">No Cases Reported Yet</h3>
                        <p className="text-muted-foreground text-center max-w-sm mb-8 text-sm sm:text-base px-6">
                            You haven't submitted any cases. Start by reporting a new case securely to our legal team.
                        </p>
                        <Link
                            to="/cases/new"
                            className="px-8 py-4 bg-card border border-border text-foreground rounded-[var(--radius-neumorph)] font-bold uppercase tracking-wider text-xs hover:border-primary/50 hover:text-primary transition-all shadow-sm hover:shadow-[0_0_15px_rgba(201,162,77,0.15)] flex items-center gap-2 group"
                        >
                            Report a Case
                            <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cases.map((c, idx) => (
                            <Link
                                key={c.id || idx}
                                to={`/cases/${c.id}`}
                                className="block bg-card border border-border shadow-sm hover:shadow-neumorph rounded-[1.5rem] hover:border-primary/40 transition-all duration-300 p-5 sm:p-6 group relative overflow-hidden"
                            >
                                {/* Hover background glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                                    <div className="flex items-start gap-5">
                                        <div className="p-3 bg-input border border-border rounded-[1rem] text-muted-foreground group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_0_10px_rgba(201,162,77,0.2)]">
                                            <FileText size={24} />
                                        </div>
                                        <div className="min-w-0 flex-1 pt-0.5">
                                            <h3 className="font-bold text-lg sm:text-xl mb-1.5 text-foreground group-hover:text-primary transition-colors truncate tracking-tight">{c.title || 'Untitled Case'}</h3>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm text-muted-foreground font-medium">
                                                <span className="uppercase tracking-widest text-[10px] sm:text-xs">
                                                    {(c.category || c.report?.category || c.pipeline?.practice_area || 'General').replace(/_/g, ' ')}
                                                </span>
                                                <span className="hidden xs:inline text-border">•</span>
                                                <span className="flex items-center gap-1.5 uppercase tracking-widest text-[10px] sm:text-xs">
                                                    <Clock size={12} className="opacity-70" />
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-6 border-t border-border/50 md:border-none pt-4 md:pt-0 mt-2 md:mt-0">
                                        <div className={`px-4 py-1.5 rounded-full border text-[10px] sm:text-xs font-bold tracking-widest ${getStatusColor(c.status)}`}>
                                            {getStatusLabel(c.status)}
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-input border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground text-muted-foreground transition-all duration-300 shrink-0">
                                            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
