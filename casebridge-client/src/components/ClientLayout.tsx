import { useEffect, useState } from 'react';
import ClientSidebar from './ClientSidebar';
import ClientBottomNav from './ClientBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, User as UserIcon } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import ConnectivityBanner from './ConnectivityBanner';

export default function ClientLayout() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    useNotifications();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data, error } = await supabase
                    .from('external_users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                // Redirect if onboarding incomplete
                if (data.status === 'pending_onboarding') {
                    navigate('/onboarding');
                    return;
                }

                setProfile(data);
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, authLoading, navigate]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex overflow-hidden lg:overflow-visible">

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <div className="hidden lg:block">
                <ClientSidebar isOpen={true} />
            </div>

            {/* Mobile Top Bar (Visible only on Mobile) */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-2xl border-b border-border z-40 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                        <UserIcon size={16} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight truncate max-w-[120px]">
                            {profile?.first_name} {profile?.last_name}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Premium Client</span>
                    </div>
                </div>
                {/* Visual branding instead of humburger menu */}
                <div className="text-right">
                    <h1 className="text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-primary/50 m-0">
                        CaseBridge
                    </h1>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 lg:ml-72 flex flex-col min-w-0 w-full h-screen lg:h-auto pt-16 lg:pt-0 pb-20 lg:pb-0 overflow-y-auto">
                <ConnectivityBanner />
                <header className="hidden lg:flex h-16 border-b border-border bg-card/30 backdrop-blur-md items-center justify-end px-8 sticky top-0 z-40">
                    <div
                        onClick={() => navigate('/profile')}
                        className="flex items-center gap-4 cursor-pointer hover:bg-input p-2 rounded-2xl transition-all group"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">
                                {profile?.first_name} {profile?.last_name}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1.5">{profile?.email}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-neumorph-inset">
                            <UserIcon size={18} className="text-primary group-hover:text-primary-foreground" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-10 mb-6 w-full">
                    <div className="max-w-6xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation Bar (Hidden on Desktop) */}
            <ClientBottomNav />

        </div>
    );
}
