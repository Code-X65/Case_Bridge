import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    Menu,
    X,
    Search,
    Bell,
    User,
    LogOut,
    ExternalLink,
    ChevronDown
} from 'lucide-react';
import InternalSidebar from './InternalSidebar';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';

interface InternalLayoutProps {
    children: React.ReactNode;
}

export default function InternalLayout({ children }: InternalLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { session, profile } = useInternalSession();
    const navigate = useNavigate();
    const location = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/internal/login');
    };

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden lg:block">
                <InternalSidebar />
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar (Slide-in) */}
            <div className={`
                fixed inset-y-0 left-0 w-72 bg-[#0F172A] z-50 transform transition-transform duration-300 ease-in-out lg:hidden
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-full overflow-y-auto">
                    <InternalSidebar />
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Global Header */}
                <header className="sticky top-0 z-30 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5 px-4 md:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 text-slate-400 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={24} />
                        </button>

                        <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-64 lg:w-96">
                            <Search size={18} className="text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search queries, matters, or staff..."
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Notification Bell */}
                        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0F172A]" />
                        </button>

                        <div className="h-8 w-px bg-white/10 mx-2" />

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 p-1.5 hover:bg-white/5 rounded-xl transition-all"
                            >
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-600/20">
                                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className="text-sm font-bold leading-none mb-1">{profile?.first_name} {profile?.last_name}</p>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{session?.role?.replace('_', ' ')}</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isProfileOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsProfileOpen(false)}
                                    />
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-[#1E293B] border border-white/10 rounded-2xl p-2 shadow-2xl z-20 animate-in fade-in slide-in-from-top-2">
                                        <Link
                                            to="/internal/profile"
                                            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                                        >
                                            <User size={16} /> My Profile
                                        </Link>
                                        <button
                                            onClick={handleSignOut}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>

                                        <div className="my-2 border-t border-white/5" />

                                        <div className="px-4 py-3">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Firm</p>
                                            <p className="text-xs font-bold text-white truncate">{session?.firm_name || 'CaseBridge Law'}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 md:p-8 lg:p-12">
                    {children}
                </main>

                {/* Footer */}
                <footer className="px-8 py-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        CaseBridge Internal Framework v2.4.0
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1">
                            Documentation <ExternalLink size={10} />
                        </a>
                        <a href="#" className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-colors">
                            Policy & Privacy
                        </a>
                    </div>
                </footer>
            </div>
        </div>
    );
}
