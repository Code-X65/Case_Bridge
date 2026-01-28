import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Building2, Briefcase,
    Contact2, FileText, CreditCard, BarChart3,
    Settings, FileClock, Shield, Bell,
    User, LogOut
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useNotifications } from '@/hooks/useNotifications';

export default function InternalSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { session, clearSession } = useInternalSession();

    const isCaseManager = session?.role === 'case_manager';
    const isAdmin = session?.role === 'admin_manager' || session?.role === 'admin';
    const isAssociate = session?.role === 'associate_lawyer' || session?.role === 'associate';

    // Fetch Firm Info
    const { data: firm } = useQuery({
        queryKey: ['firm', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase.from('firms').select('*').eq('id', session!.firm_id).single();
            return data;
        }
    });

    const handleLogout = async () => {
        await clearSession.mutateAsync();
        await supabase.auth.signOut();
        navigate('/internal/login');
    };

    const { unreadCount } = useNotifications();

    const isActive = (path: string) => location.pathname === path;

    const NavItem = ({ label, path, icon: Icon, badgeCount }: any) => (
        <button
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all text-left group mb-1 ${isActive(path)
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-900/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <div className="relative">
                <Icon className={`w-4 h-4 ${isActive(path) ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-[#0F172A] flex items-center justify-center">
                        <span className="sr-only">New notifications</span>
                    </span>
                )}
            </div>
            <span className="flex-1 truncate">{label}</span>
            {badgeCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </span>
            )}
        </button>
    );

    const SectionHeader = ({ label }: { label: string }) => (
        <div className="px-4 mt-6 mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        </div>
    );

    return (
        <aside className="fixed top-0 left-0 w-64 h-full border-r border-white/10 bg-[#0F172A] flex flex-col z-50">
            {/* Header */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-white text-xs">CB</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">CaseBridge</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                            {isAdmin ? 'Admin Console' : isCaseManager ? 'Case Manager' : isAssociate ? 'Associate Portal' : 'Internal Portal'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrollable Nav Area */}
            <nav className="flex-1 overflow-y-auto px-2 py-4 custom-scrollbar">

                {/* ADMIN SIDEBAR */}
                {isAdmin && (
                    <>
                        <SectionHeader label="Primary" />
                        <NavItem label="Dashboard" path="/internal/dashboard" icon={LayoutDashboard} />
                        <NavItem label="Intake" path="/intake" icon={FileText} />
                        <NavItem label="Staff Management" path="/internal/staff-management" icon={Users} />
                        <NavItem label="Firm Profile" path="/internal/firm-profile" icon={Building2} />
                        <NavItem label="Cases" path="/internal/cases" icon={Briefcase} />
                        <NavItem label="Clients" path="/internal/clients" icon={Contact2} />
                        <NavItem label="Calendar" path="/internal/case-manager/calendar" icon={FileClock} />
                        <NavItem label="Documents" path="/internal/documents" icon={FileText} />
                        <NavItem label="Billing" path="/internal/billing" icon={CreditCard} />
                        <NavItem label="Reports" path="/internal/reports" icon={BarChart3} />

                        <SectionHeader label="System" />
                        <NavItem label="Settings" path="/internal/settings" icon={Settings} />
                        <NavItem label="Audit Logs" path="/internal/audit-logs" icon={FileClock} />
                        <NavItem label="Security & Access" path="/internal/security" icon={Shield} />
                        <NavItem label="Notifications" path="/internal/notifications" icon={Bell} badgeCount={unreadCount} />
                    </>
                )}

                {/* CASE MANAGER SIDEBAR */}
                {isCaseManager && (
                    <>
                        <SectionHeader label="Primary" />
                        <NavItem label="Dashboard" path="/internal/case-manager/dashboard" icon={LayoutDashboard} />
                        <NavItem label="Intake" path="/intake" icon={FileText} />
                        <NavItem label="Matters" path="/internal/case-manager/matters" icon={Briefcase} />
                        <NavItem label="Clients" path="/internal/case-manager/clients" icon={Contact2} />
                        <NavItem label="Calendar" path="/internal/case-manager/calendar" icon={FileClock} />
                        <NavItem label="Documents" path="/internal/case-manager/documents" icon={FileText} />
                        <NavItem label="Tasks" path="/internal/case-manager/tasks" icon={CreditCard} />

                        <SectionHeader label="System" />
                        <NavItem label="Notifications" path="/internal/case-manager/notifications" icon={Bell} badgeCount={unreadCount} />
                    </>
                )}

                {/* ASSOCIATE LAWYER SIDEBAR */}
                {isAssociate && (
                    <>
                        <SectionHeader label="Primary" />
                        <NavItem label="Dashboard" path="/internal/associate/dashboard" icon={LayoutDashboard} />
                        <NavItem label="My Matters" path="/internal/associate/matters" icon={Briefcase} />
                        <NavItem label="My Schedule" path="/internal/associate/schedule" icon={FileClock} />
                        <NavItem label="My Tasks" path="/internal/associate/tasks" icon={CreditCard} />
                        <NavItem label="Documents" path="/internal/associate/documents" icon={FileText} />

                        <SectionHeader label="System" />
                        <NavItem label="Notifications" path="/internal/associate/notifications" icon={Bell} badgeCount={unreadCount} />
                    </>
                )}

            </nav>

            {/* Footer / Account */}
            <div className="p-4 border-t border-white/10 bg-[#0F172A]">
                <SectionHeader label="Account" />
                <NavItem label="My Profile" path="/internal/profile" icon={User} />

                <div className="mt-2 pt-2 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>

                    <div className="px-4 mt-4">
                        <p className="text-xs font-medium text-white truncate">{firm?.name || 'Loading...'}</p>
                        <p className="text-[10px] text-slate-500 uppercase truncate">{session?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
