import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    PlusCircle,
    HelpCircle,
    Clock,
    Settings as SettingsIcon,
    ChevronRight,
    ShieldCheck,
    FileText,
    Bell,
    PenTool,
    Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['dashboard', user?.id],
        enabled: !!user,
        queryFn: async () => {
            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('external_users')
                .select('first_name')
                .eq('id', user!.id)
                .single();

            // 2. Fetch Matters & Reports with error handling
            const [reportsRes, mattersRes, notifsRes, sigRes] = await Promise.all([
                fetch(`${API_URL}/workspace/reports?client_id=${user!.id}`),
                fetch(`${API_URL}/matters?client_id=${user!.id}`),
                fetch(`${API_URL}/workspace/notifications?client_id=${user!.id}&limit=5`),
                fetch(`${API_URL}/workspace/signatures?client_id=${user!.id}&status=pending`)
            ]);

            // Parse responses with error handling
            const parseJson = async (res: Response) => {
                if (!res.ok) {
                    console.error(`API error: ${res.status} ${res.statusText}`);
                    return { success: false, data: [] };
                }
                return res.json();
            };

            const [reportsResult, mattersResult, notifsResult, sigResult] = await Promise.all([
                parseJson(reportsRes),
                parseJson(mattersRes),
                parseJson(notifsRes),
                parseJson(sigRes)
            ]);

            // Deduplicate: If a matter exists for a report, hide the report
            const mattersData = mattersResult.data || [];
            const casesData = reportsResult.data || [];
            const convertedReportIds = new Set(mattersData.map((m: any) => m.case_report_id).filter(Boolean));
            const uniqueReports = casesData.filter((r: any) => !convertedReportIds.has(r.id));
            
            const allCombined = [...uniqueReports, ...mattersData].sort((a: any, b: any) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            return {
                userName: profile?.first_name || user?.user_metadata?.first_name || 'Client',
                cases: allCombined,
                activity: notifsResult.data || [],
                pendingSignatures: sigResult.data || []
            };
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs animate-pulse">Synchronizing Workspace...</p>
            </div>
        );
    }

    const { userName, cases, activity, pendingSignatures } = dashboardData || { userName: '', cases: [], activity: [], pendingSignatures: [] };
    const hasCases = cases.length > 0;

    return (
        <div className="animate-fade-in relative max-w-7xl mx-auto">

            {/* Ambient Background Blur for main content area */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">

                {/* ⚡ Action Required: Pending Signatures Banner */}
                {pendingSignatures.length > 0 && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-amber-500/5">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                            <PenTool size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1">Action Required — Signature Pending</p>
                            <p className="text-sm text-amber-200/70 mb-3">
                                You have <strong>{pendingSignatures.length}</strong> document{pendingSignatures.length > 1 ? 's' : ''} awaiting your signature.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {pendingSignatures.map((req: any) => (
                                    <Link
                                        key={req.id}
                                        to={`/sign/${req.id}`}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                                    >
                                        <PenTool size={12} /> Sign: {req.document?.filename || 'Document'}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-8 lg:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-2">
                            Welcome, <span className="text-primary">{userName || 'Client'}</span>
                        </h1>
                        <p className="text-muted-foreground text-base sm:text-lg">Your secure legal portal is active and ready.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">

                        {/* Status Card - Premium Aesthetic */}
                        <div className="bg-card border border-border relative overflow-hidden group shadow-neumorph rounded-[2rem] p-8 sm:p-10 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>

                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 hidden sm:block scale-150 origin-top-right">
                                <ShieldCheck size={200} />
                            </div>

                            <div className="relative z-10 text-left">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(201,162,77,0.8)]"></div>
                                    <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">Account Status</span>
                                </div>

                                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-foreground">
                                    {!hasCases ? "System Ready" : 
                                     cases[0]?.status === 'closed' ? "Case Resolved" : "Active Engagement"}
                                </h3>

                                <p className="text-muted-foreground leading-relaxed max-w-xl mb-10 text-sm sm:text-base">
                                    {!hasCases
                                        ? "You haven't submitted any cases yet. Your identity is verified and you are ready to engage with legal professionals when needed."
                                        : "Track your active legal engagements and case progress here."
                                    }
                                </p>

                                {/* Visual Roadmap - Dynamic Lifecycle Tracker */}
                                <div className="flex items-center mt-6 overflow-hidden">
                                    {[
                                        { key: 'submitted', label: 'Verified' },
                                        { key: 'reviewing', label: 'Reviewing' },
                                        { key: 'case_open', label: 'Accepted' },
                                        { key: 'in_progress', label: 'Active' },
                                        { key: 'closed', label: 'Resolved' }
                                    ].map((step, idx, arr) => {
                                        const caseStatus = cases[0]?.status || 'submitted';
                                        const statusOrder = ['submitted', 'reviewing', 'case_open', 'in_progress', 'closed'];
                                        const currentStepIdx = statusOrder.indexOf(caseStatus);
                                        const isCompleted = idx < currentStepIdx;
                                        const isActive = idx === currentStepIdx;
                                        
                                        return (
                                            <div key={step.key} className={`flex flex-col items-center flex-1 relative ${!isActive && !isCompleted ? 'opacity-30' : ''}`}>
                                                <div className={`h-4 w-4 rounded-full z-10 transition-all duration-500 ${
                                                    isActive ? 'bg-primary ring-4 ring-primary/20 scale-125' : 
                                                    isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground'
                                                }`}>
                                                    {isCompleted && <ShieldCheck size={10} className="text-white m-0.5" />}
                                                </div>
                                                {idx < arr.length - 1 && (
                                                    <div className={`absolute top-2 left-1/2 w-full h-[2px] transition-colors duration-500 ${
                                                        isCompleted ? 'bg-emerald-500/50' : 'bg-border'
                                                    }`}></div>
                                                )}
                                                <span className={`text-[9px] mt-4 font-black uppercase tracking-widest w-full text-center transition-colors duration-300 ${
                                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                                }`}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {/* Primary CTA */}
                            <Link
                                to="/cases/new"
                                className="bg-primary/10 border border-primary/20 group relative overflow-hidden rounded-[1.5rem] p-6 sm:p-8 block transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,162,77,0.15)] hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="mb-6 bg-primary w-14 h-14 rounded-2xl flex items-center justify-center text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
                                        <PlusCircle size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">Report a Case</h3>
                                    <div className="flex items-end justify-between mt-auto pt-4">
                                        <p className="text-muted-foreground text-sm m-0 max-w-[80%] leading-relaxed">
                                            Securely submit details for immediate legal review.
                                        </p>
                                        <ChevronRight size={20} className="text-primary opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all shrink-0" />
                                    </div>
                                </div>
                            </Link>

                            {/* Secondary CTA */}
                            <button className="bg-card border border-border bg-gradient-to-br from-card to-card/50 shadow-neumorph-inset group relative overflow-hidden rounded-[1.5rem] p-6 sm:p-8 text-left w-full transition-all duration-300 hover:border-primary/50 hover:-translate-y-1">
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="mb-6 bg-input border border-border w-14 h-14 rounded-2xl flex items-center justify-center text-muted-foreground transition-colors duration-300 group-hover:text-foreground group-hover:border-primary/30">
                                        <HelpCircle size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-foreground">How it Works</h3>
                                    <div className="flex items-end justify-between mt-auto pt-4">
                                        <p className="text-muted-foreground text-sm m-0 max-w-[80%] leading-relaxed">
                                            Security, privacy, and full engagement lifecycle.
                                        </p>
                                        <ChevronRight size={20} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all shrink-0" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Sidebar / Activity Column */}
                    <div className="space-y-6 sm:space-y-8">
                        {/* Profile Quick Link */}
                        <div className="bg-card border border-border shadow-neumorph rounded-[1.5rem] p-6 text-left relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Quick Actions</h3>
                            </div>
                            <ul className="space-y-3">
                                <li>
                                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-input border border-transparent hover:border-border shadow-sm hover:shadow-neumorph-inset transition-all text-sm font-bold text-foreground group text-left">
                                        <div className="w-10 h-10 rounded-lg bg-input flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                            <UserIconMini className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        Personal Profile
                                        <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-input border border-transparent hover:border-border shadow-sm hover:shadow-neumorph-inset transition-all text-sm font-bold text-foreground group text-left">
                                        <div className="w-10 h-10 rounded-lg bg-input flex items-center justify-center shrink-0 border border-border group-hover:border-primary/30 group-hover:text-primary transition-colors">
                                            <SettingsIcon size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        Identity & Security
                                        <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-1" />
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Activity Feed */}
                        <div className="bg-card/50 border border-border shadow-neumorph-inset rounded-[1.5rem] p-6 text-left">
                            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Clock size={14} className="text-primary" />
                                Recent Activity
                            </h2>

                            <div className="space-y-3">
                                {activity.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-xl bg-card/50 min-h-[200px]">
                                        <div className="w-12 h-12 rounded-full bg-input border border-border flex items-center justify-center mb-4">
                                            <FileText size={20} className="text-muted-foreground/50" />
                                        </div>
                                        <p className="text-muted-foreground m-0 text-sm font-medium">No recent activity logged</p>
                                    </div>
                                ) : (
                                    activity.map((item: any) => (
                                        <div key={item.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                    <Bell size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-foreground mb-1 mt-0.5 truncate group-hover:text-primary transition-colors">{item.message}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {item.read === false && (
                                                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"></span>
                                                        )}
                                                        <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {activity.length > 0 && (
                                    <div className="pt-4 border-t border-border mt-4">
                                        <Link to="/notifications" className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                                            View Full Trail
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}

const UserIconMini = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
