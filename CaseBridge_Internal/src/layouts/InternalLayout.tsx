import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    Bell,
    LogOut,
    Menu,
    X,
    Building2,
    Shield,
    User,
    Banknote,
} from 'lucide-react';
import { useState } from 'react';

function NotificationBadge({ userId }: { userId: string }) {
    const { data: count } = useQuery({
        queryKey: ['notifications-unread-count', userId],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);
            if (error) throw error;
            return count || 0;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    if (!count) return null;

    return (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
    );
}

export default function InternalLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (!profileData) return null;

            // Fetch firm separately
            const { data: firmData } = await supabase
                .from('firms')
                .select('name')
                .eq('id', profileData.firm_id)
                .single();

            return {
                ...profileData,
                firms: firmData,
            };
        },
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin_manager', 'case_manager', 'associate_lawyer'] },
        { name: 'Case Management', href: '/cases', icon: Briefcase, roles: ['admin_manager', 'case_manager', 'associate_lawyer'] },
        { name: 'Billing', href: '/earnings', icon: Banknote, roles: ['admin_manager', 'case_manager'] },
        { name: 'Team & Clients', href: '/users', icon: Users, roles: ['admin_manager', 'case_manager'] },
        { name: 'Firm Profile', href: '/firm-profile', icon: Building2, roles: ['admin_manager'] },
        { name: 'Audit Logs', href: '/audit-logs', icon: Shield, roles: ['admin_manager'] },
        { name: 'Profile', href: '/profile', icon: User, roles: ['admin_manager', 'case_manager', 'associate_lawyer'] },
    ];

    const filteredNavigation = navigation.filter(item =>
        item.roles.includes(profile?.internal_role || '')
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0F172A] border-r border-slate-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-semibold text-white text-sm uppercase tracking-tight">
                                CaseBridge
                            </span>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Firm Info */}
                    {profile?.firms && (
                        <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-1">
                                Firm
                            </p>
                            <p className="text-xs font-semibold text-slate-200 truncate">
                                {profile.firms.name}
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {filteredNavigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm font-medium transition-colors ${isActive
                                        ? 'bg-blue-800 text-white'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-slate-800">
                        <Link to="/profile" className="flex items-center gap-3 mb-3 p-2 hover:bg-white/5 rounded-md transition-colors group">
                            <div className="w-10 h-10 bg-slate-800 group-hover:bg-blue-900 rounded-md flex items-center justify-center transition-colors">
                                <span className="text-sm font-semibold text-slate-300 group-hover:text-white">
                                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate">
                                    {profile?.first_name} {profile?.last_name}
                                </p>
                                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 truncate">
                                    {profile?.internal_role?.replace('_', ' ')}
                                </p>
                            </div>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs font-semibold uppercase tracking-widest transition-colors"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:pl-64">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden text-slate-600 hover:text-slate-900"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1 lg:flex-none" />

                    <div className="flex items-center gap-3">
                        {/* Notifications */}
                        <Link
                            to="/notifications"
                            className="relative p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                        >
                            <Bell className="h-5 w-5" />
                            {profile?.id && (
                                <NotificationBadge userId={profile.id} />
                            )}
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
