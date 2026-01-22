import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard,
    FileText,
    Calendar,
    CreditCard,
    User,
    LogOut,
    Gavel,
    Bell,
    Settings,
    ChevronRight,
    Search,
    Loader2,
    File as FileIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { IdleTimer } from '@/components/auth/IdleTimer';


export const ClientLayout = () => {
    const { session, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ cases: any[], documents: any[] }>({ cases: [], documents: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const fetchUnreadCount = async () => {
        if (!session?.user) return;
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', session.user.id)
            .eq('read', false);

        if (!error) {
            setUnreadCount(count || 0);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim() || !session?.user) {
            setSearchResults({ cases: [], documents: [] });
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        setShowSearchResults(true);

        try {
            // Search Matters
            const { data: casesData } = await supabase
                .from('matters')
                .select('id, title, matter_number, status')
                .eq('client_id', session.user.id)
                .or(`title.ilike.%${query}%,matter_number.ilike.%${query}%`)
                .limit(5);

            // Search Documents
            const { data: docsData } = await supabase
                .from('documents')
                .select('id, file_name, matter_id, matters!inner(title, client_id)')
                .eq('matters.client_id', session.user.id)
                .ilike('file_name', `%${query}%`)
                .limit(5);

            setSearchResults({
                cases: casesData || [],
                documents: docsData || []
            });
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const handleScroll = () => {
            setScrolled(window.scrollY > 0);
        };
        window.addEventListener('scroll', handleScroll);

        const loadProfile = async () => {
            if (session?.user) {
                try {
                    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (isMounted) {
                        setProfile(data);
                    }
                } catch (error) {
                    console.error('Profile fetch aborted or failed:', error);
                }
            }
        };

        loadProfile();
        fetchUnreadCount();

        // Real-time subscription for notifications
        const channel = supabase
            .channel('unread-notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session?.user?.id}`
                },
                () => {
                    fetchUnreadCount();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            window.removeEventListener('scroll', handleScroll);
            supabase.removeChannel(channel);
        };
    }, [session]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/client/dashboard' },
        { label: 'Case Management', icon: Gavel, path: '/client/matters' },
        { label: 'Document Vault', icon: FileText, path: '/client/documents' },
        { label: 'Consultations', icon: Calendar, path: '/client/consultations' },
        { label: 'Billing & Invoices', icon: CreditCard, path: '/client/billing' },
        { label: 'Account Profile', icon: User, path: '/client/profile' },
    ];

    const isActive = (path: string) => location.pathname.startsWith(path);

    const hasResults = searchResults.cases.length > 0 || searchResults.documents.length > 0;

    return (
        <div className="flex min-h-screen bg-slate-50/50">
            <IdleTimer />
            {/* Sidebar */}

            <aside className="w-64 bg-white border-r border-slate-100 hidden lg:flex flex-col sticky top-0 h-screen z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
                <div className="p-6">
                    <Link to="/client/dashboard" className="flex items-center gap-2 text-slate-900 group">
                        <div className="p-1.5 bg-primary rounded-lg shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
                            <Gavel className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-black text-xl tracking-tighter uppercase">CaseBridge</span>
                    </Link>
                </div>

                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                    <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Navigation</p>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center justify-between group px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive(item.path)
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={`h-4 w-4 ${isActive(item.path) ? 'text-primary' : 'group-hover:text-primary transition-colors'}`} />
                                <span className={`text-xs font-bold ${isActive(item.path) ? 'text-white' : ''}`}>{item.label}</span>
                            </div>
                            {isActive(item.path) && <ChevronRight className="h-3 w-3 text-primary animate-in fade-in slide-in-from-left-2" />}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50 flex flex-col gap-2">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tighter">{profile?.first_name || 'Legal'} {profile?.last_name || 'Client'}</p>
                                <p className="text-[9px] font-bold text-primary uppercase">Member</p>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-10 font-bold px-3 text-xs"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2.5 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className={`h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-10 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm' : 'bg-transparent'}`}>
                    <div className="flex items-center gap-4 flex-1 max-w-lg">
                        <div className="relative w-full hidden md:block group" ref={searchRef}>
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search Cases or Documents..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                                className="h-9 pl-10 rounded-lg bg-white border-slate-100 focus:border-primary focus:ring-primary shadow-sm text-sm font-medium"
                            />

                            {/* Search Results Dropdown */}
                            {showSearchResults && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-100 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[400px] overflow-y-auto">
                                    <div className="p-2">
                                        {isSearching ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                            </div>
                                        ) : hasResults ? (
                                            <div className="space-y-1">
                                                {/* Cases Section */}
                                                {searchResults.cases.length > 0 && (
                                                    <div className="pb-2">
                                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                            <Gavel className="h-2.5 w-2.5" /> Cases
                                                        </p>
                                                        {searchResults.cases.map((matter) => (
                                                            <Link
                                                                key={matter.id}
                                                                to={`/client/matters/${matter.id}`}
                                                                onClick={() => setShowSearchResults(false)}
                                                                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 group transition-all"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight line-clamp-1">{matter.title}</span>
                                                                    <span className="text-[10px] font-mono text-slate-400">{matter.matter_number}</span>
                                                                </div>
                                                                <div className="bg-slate-50 px-2 py-0.5 rounded text-[8px] font-black uppercase text-slate-500 border border-slate-100">
                                                                    {matter.status}
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Documents Section */}
                                                {searchResults.documents.length > 0 && (
                                                    <div className="pb-2">
                                                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                            <FileIcon className="h-2.5 w-2.5" /> Documents
                                                        </p>
                                                        {searchResults.documents.map((doc) => (
                                                            <Link
                                                                key={doc.id}
                                                                to={`/client/matters/${doc.matter_id}`}
                                                                onClick={() => setShowSearchResults(false)}
                                                                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 group transition-all"
                                                            >
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight truncate">{doc.file_name}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Case: {doc.matters?.title}</span>
                                                                </div>
                                                                <FileIcon className="h-3 w-3 text-slate-200 group-hover:text-primary transition-colors shrink-0 ml-4" />
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center bg-slate-50/50 rounded-lg">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No results matching "{searchQuery}"</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 p-2 border-t border-slate-100 flex items-center justify-between px-3">
                                        <Link
                                            to="/client/matters"
                                            onClick={() => setShowSearchResults(false)}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                                        >
                                            All Cases
                                        </Link>
                                        <Link
                                            to="/client/documents"
                                            onClick={() => setShowSearchResults(false)}
                                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-colors"
                                        >
                                            View Vault
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-100 shadow-sm">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-primary transition-all relative" asChild>
                                <Link to="/client/notifications">
                                    <Bell className="h-4 w-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[8px] font-black rounded-full border border-white flex items-center justify-center animate-in zoom-in">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-slate-400 hover:text-primary transition-all" asChild>
                                <Link to="/client/profile">
                                    <Settings className="h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center border-b-2 border-primary shadow-md overflow-hidden">
                            {profile?.first_name ? (
                                <span className="text-white font-black text-[10px]">{profile.first_name[0]}{profile.last_name[0]}</span>
                            ) : (
                                <User className="h-4 w-4 text-white" />
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
