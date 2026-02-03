import { useEffect, useState } from 'react';
import ClientSidebar from './ClientSidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, User as UserIcon, Menu, X } from 'lucide-react';

export default function ClientLayout() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    // Close mobile menu when resizing to desktop or when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-50 flex">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mobile-menu-button lg:hidden fixed top-4 right-4 z-[60] bg-blue-600 p-2 rounded-lg text-white shadow-lg"
                aria-label="Toggle menu"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="mobile-overlay animate-fade-in lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <ClientSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
                <header className="h-16 border-b border-white/5 flex items-center justify-end px-4 sm:px-8 glass sticky top-0 z-40">
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{profile?.email}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20">
                            <UserIcon size={16} className="text-primary" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                    <div className="max-w-5xl mx-auto w-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
