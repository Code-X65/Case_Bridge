import { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    PlusCircle,
    HelpCircle,
    Clock,
    Settings as SettingsIcon,
    ChevronRight,
    ShieldCheck,
    FileText,
    Bell
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    const [userName, setUserName] = useState('');
    const [cases, setCases] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Profile
                const { data: profile } = await supabase
                    .from('external_users')
                    .select('first_name')
                    .eq('id', user.id)
                    .single();

                setUserName(profile?.first_name || user?.user_metadata?.first_name || 'Client');

                // 2. Fetch Cases
                const { data: casesData } = await supabase
                    .from('case_reports')
                    .select('id, title, status, created_at')
                    .eq('client_id', user.id);

                setCases(casesData || []);

                // 3. Fetch Recent Activity (Notifications)
                const { data: notifs } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                setActivity(notifs || []);

            } catch (err) {
                console.error("Dashboard Fetch Error", err);
            }
        };
        fetchData();
    }, [user]);

    const hasCases = cases.length > 0;

    useGSAP(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.from('h1', { opacity: 0, duration: 0.8 })
            .from('.header-desc', { opacity: 0, duration: 0.6 }, '-=0.6')
            .from('.status-card', { opacity: 0, duration: 0.8 }, '-=0.4')
            .from('.action-card', { opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.6')
            .from('.sidebar-item', { opacity: 0, duration: 0.6, stagger: 0.05 }, '-=0.8');

    }, { scope: containerRef });

    return (
        <>
            <div ref={containerRef} className="px-2 sm:px-0">
                <div className="mb-6 sm:mb-8 lg:mb-10">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 mb-2">
                        Welcome, {userName || 'Client'}
                    </h1>
                    <p className="header-desc text-muted-foreground text-sm sm:text-base lg:text-lg">Your secure legal portal is active and ready.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-6 sm:space-y-8">

                        {/* Status Card - Enhanced */}
                        <div className="status-card glass-card relative overflow-hidden group border-l-4 border-l-blue-500 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 p-6 sm:p-8">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
                                <ShieldCheck size={120} />
                            </div>

                            <div className="relative z-10 text-left">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-blue-400 font-black tracking-[0.2em] text-[10px] uppercase">Account Status</span>
                                </div>

                                <h3 className="text-xl sm:text-2xl font-bold mb-3">
                                    {!hasCases ? "System Ready" : "Active Engagement"}
                                </h3>

                                <p className="text-muted-foreground leading-relaxed max-w-xl mb-6 text-xs sm:text-sm">
                                    {!hasCases
                                        ? "You haven't submitted any cases yet. Your identity is verified and you are ready to engage with legal professionals when needed."
                                        : "Track your active legal engagements and case progress here."
                                    }
                                </p>

                                {/* Visual Roadmap Step 0 */}
                                <div className="flex items-center gap-3 sm:gap-4 mt-6 opacity-80 overflow-x-auto no-scrollbar pb-2">
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
                                        <span className="text-[9px] mt-2 font-black uppercase tracking-widest text-blue-300">Verified</span>
                                    </div>
                                    <div className="h-[1px] w-8 sm:w-16 bg-white/10 shrink-0"></div>
                                    <div className="flex flex-col items-center shrink-0 opacity-40">
                                        <div className="h-2.5 w-2.5 rounded-full bg-white/20"></div>
                                        <span className="text-[9px] mt-2.5 font-black uppercase tracking-widest">In Review</span>
                                    </div>
                                    <div className="h-[1px] w-8 sm:w-16 bg-white/10 shrink-0"></div>
                                    <div className="flex flex-col items-center shrink-0 opacity-40">
                                        <div className="h-2.5 w-2.5 rounded-full bg-white/20"></div>
                                        <span className="text-[9px] mt-2.5 font-black uppercase tracking-widest">Matched</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            {/* Primary CTA - Styled Up */}
                            <Link
                                to="/cases/new"
                                className="action-card glass-card group relative overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 block p-6 sm:p-8"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10 text-left">
                                    <div className="mb-4 bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                        <PlusCircle size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 group-hover:text-blue-200 transition-colors">Report a Case</h3>
                                    <div className="flex items-end justify-between">
                                        <p className="text-muted-foreground text-xs m-0 max-w-[80%] leading-relaxed">
                                            Securely submit details for immediate legal review.
                                        </p>
                                        <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-400 shrink-0" />
                                    </div>
                                </div>
                            </Link>

                            {/* Secondary CTA */}
                            <button className="action-card glass-card group relative overflow-hidden hover:border-white/30 transition-all duration-300 hover:-translate-y-1 text-left w-full p-6 sm:p-8">
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10">
                                    <div className="mb-4 bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-colors duration-300">
                                        <HelpCircle size={24} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">How it Works</h3>
                                    <div className="flex items-end justify-between">
                                        <p className="text-muted-foreground text-xs m-0 max-w-[80%] leading-relaxed">
                                            Security, privacy, and full engagement lifecycle.
                                        </p>
                                        <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-slate-400 shrink-0" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Sidebar / Activity Column */}
                    <div className="space-y-6">
                        {/* Profile Quick Link */}
                        <div className="sidebar-item glass-card bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6 text-left">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Quick Actions</h3>
                            </div>
                            <ul className="space-y-2">
                                <li>
                                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-xs font-bold text-slate-300 group text-left">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                            <UserIconMini className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        Personal Profile
                                        <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-xs font-bold text-slate-300 group text-left">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                            <SettingsIcon size={16} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        Identity & Security
                                        <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Activity Feed */}
                        <div className="sidebar-item text-left">
                            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2 pl-2">
                                <Clock size={16} />
                                Recent Activity
                            </h2>

                            <div className="space-y-3">
                                {activity.length === 0 ? (
                                    <div className="glass-card flex flex-col items-center justify-center py-10 text-center border-dashed border-white/10 bg-transparent min-h-[200px]">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                            <FileText size={18} className="text-muted-foreground/30" />
                                        </div>
                                        <p className="text-muted-foreground m-0 text-xs font-medium">No recent activity logged</p>
                                    </div>
                                ) : (
                                    activity.map((item) => (
                                        <div key={item.id} className="glass-card p-4 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                                            <div className="flex items-start gap-4">
                                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                                    <Bell size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white mb-1 truncate group-hover:text-blue-300 transition-colors">{item.payload.title}</p>
                                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed italic">"{item.payload.message}"</p>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full tracking-wider border border-blue-400/20">
                                                            {item.event_type.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[8px] text-slate-600 font-black tracking-widest uppercase">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {activity.length > 0 && (
                                    <Link to="/notifications" className="block text-center text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-400 transition-colors pt-3">
                                        View Full Trail
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
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
