import React, { useEffect, useState } from 'react';
import ClientSidebar from './ClientSidebar';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, User as UserIcon } from 'lucide-react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
        <div className="min-h-screen bg-[#020617] text-slate-50 flex">
            <ClientSidebar />

            <div className="flex-1 ml-64 flex flex-col">
                <header className="h-16 border-b border-white/5 flex items-center justify-end px-8 glass sticky top-0 z-40">
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

                <main className="flex-1 p-8">
                    <div className="max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
