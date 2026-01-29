import { useRef, useState, useEffect } from 'react';
import ClientLayout from '../components/ClientLayout';
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

        tl.from('h1', { y: 20, opacity: 0, duration: 0.8 })
            .from('.header-desc', { y: 10, opacity: 0, duration: 0.6 }, '-=0.6')
            .from('.status-card', { y: 30, opacity: 0, duration: 0.8 }, '-=0.4')
            .from('.action-card', { y: 30, opacity: 0, duration: 0.6, stagger: 0.1 }, '-=0.6')
            .from('.sidebar-item', { x: 20, opacity: 0, duration: 0.6, stagger: 0.05 }, '-=0.8');

    }, { scope: containerRef });

    return (
        <ClientLayout>
            <div ref={containerRef}>
                <div className="mb-10">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 mb-2">
                        Welcome, {userName || 'Client'}
                    </h1>
                    <p className="header-desc text-muted-foreground text-lg">Your secure legal portal is active and ready.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Status Card - Enhanced */}
                        <div className="status-card glass-card relative overflow-hidden group border-l-4 border-l-blue-500 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldCheck size={120} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-blue-400 font-semibold tracking-wider text-xs uppercase">Account Status</span>
                                </div>

                                <h3 className="text-2xl font-bold mb-3">
                                    {!hasCases ? "You are all recommended." : "Active Engagement"}
                                </h3>

                                <p className="text-muted-foreground leading-relaxed max-w-xl mb-6">
                                    {!hasCases
                                        ? "You haven’t submitted any cases yet. Your identity is verified and you are ready to engage with legal professionals when needed."
                                        : "Track your active engagements here."
                                    }
                                </p>

                                {/* Visual Roadmap Step 0 */}
                                <div className="flex items-center gap-4 mt-6 opacity-70">
                                    <div className="flex flex-col items-center">
                                        <div className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20"></div>
                                        <span className="text-[10px] mt-2 font-medium text-blue-300">Verified</span>
                                    </div>
                                    <div className="h-0.5 w-16 bg-white/10"></div>
                                    <div className="flex flex-col items-center opacity-50">
                                        <div className="h-3 w-3 rounded-full bg-white/20"></div>
                                        <span className="text-[10px] mt-2">Case Submitted</span>
                                    </div>
                                    <div className="h-0.5 w-16 bg-white/10"></div>
                                    <div className="flex flex-col items-center opacity-50">
                                        <div className="h-3 w-3 rounded-full bg-white/20"></div>
                                        <span className="text-[10px] mt-2">Matched</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Primary CTA - Styled Up */}
                            <Link
                                to="/cases/new"
                                className="action-card glass-card group relative overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 block"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10">
                                    <div className="mb-4 bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                                        <PlusCircle size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-200 transition-colors">Report a Case</h3>
                                    <div className="flex items-end justify-between">
                                        <p className="text-muted-foreground text-sm m-0 max-w-[80%]">
                                            Securely submit details for legal review.
                                        </p>
                                        <ChevronRight className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-blue-400" />
                                    </div>
                                </div>
                            </Link>

                            {/* Secondary CTA */}
                            <button className="action-card glass-card group relative overflow-hidden hover:border-white/30 transition-all duration-300 hover:-translate-y-1 text-left w-full">
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                <div className="relative z-10">
                                    <div className="mb-4 bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white/10 group-hover:text-white transition-colors duration-300">
                                        <HelpCircle size={28} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">How it Works</h3>
                                    <div className="flex items-end justify-between">
                                        <p className="text-muted-foreground text-sm m-0 max-w-[80%]">
                                            Security, privacy, and engagement flow.
                                        </p>
                                        <ChevronRight className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-slate-400" />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Sidebar / Activity Column */}
                    <div className="space-y-6">
                        {/* Profile Quick Link */}
                        <div className="sidebar-item glass-card bg-gradient-to-b from-white/5 to-transparent p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                            </div>
                            <ul className="space-y-3">
                                <li>
                                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-slate-300 group">
                                        <UserIconMini className="text-slate-500 group-hover:text-blue-400" />
                                        Complete Profile
                                        <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100" />
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/settings')} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-sm text-slate-300 group">
                                        <SettingsIcon size={16} className="text-slate-500 group-hover:text-blue-400" />
                                        Security Settings
                                        <ChevronRight size={14} className="ml-auto opacity-30 group-hover:opacity-100" />
                                    </button>
                                </li>
                            </ul>
                        </div>

                        {/* Activity Feed */}
                        <div className="sidebar-item">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2 pl-2">
                                <Clock size={16} />
                                Recent Activity
                            </h2>

                            <div className="space-y-3">
                                {activity.length === 0 ? (
                                    <div className="glass-card flex flex-col items-center justify-center py-12 text-center border-dashed border-white/10 bg-transparent min-h-[200px]">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                            <FileText size={18} className="text-muted-foreground/50" />
                                        </div>
                                        <p className="text-muted-foreground m-0 text-xs">No recent activity yet</p>
                                    </div>
                                ) : (
                                    activity.map((item) => (
                                        <div key={item.id} className="glass-card p-4 hover:border-blue-500/30 transition-all group">
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                                    <Bell size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white mb-1 truncate">{item.payload.title}</p>
                                                    <p className="text-[10px] text-slate-400 line-clamp-1 italic">"{item.payload.message}"</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-400/5 px-1.5 py-0.5 rounded tracking-tighter">
                                                            {item.event_type.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[8px] text-slate-600 font-bold tracking-tighter">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {activity.length > 0 && (
                                    <Link to="/notifications" className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-400 transition-colors pt-2">
                                        View All Notifications
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </ClientLayout>
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
