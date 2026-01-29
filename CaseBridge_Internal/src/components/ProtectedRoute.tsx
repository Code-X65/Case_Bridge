import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import type { ReactNode } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: 'admin_manager' | 'case_manager' | 'associate_lawyer' | ('admin_manager' | 'case_manager' | 'associate_lawyer')[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { session: internalSession, isLoading: sessionLoading } = useInternalSession();

    // Fetch Auth Session
    const { data: authSession, isLoading: authLoading } = useQuery({
        queryKey: ['auth_session'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        },
    });

    // Fetch Profile for onboarding/status checks
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile_status', authSession?.user?.id],
        enabled: !!authSession?.user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('onboarding_state, status, first_login_flag')
                .eq('id', authSession!.user.id)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
    });

    if (sessionLoading || authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto mb-6" />
                    <p className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase">Security Clearance In Progress</p>
                </div>
            </div>
        );
    }

    // 1. If not authenticated with Supabase, redirect to login
    if (!authLoading && !authSession) {
        return <Navigate to="/internal/login" state={{ from: location }} replace />;
    }

    // 2. Security Check: Locked or Suspended
    if (profile?.status === 'locked') {
        return <Navigate to="/auth/locked" replace />;
    }
    if (profile?.status === 'suspended') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-6">
                <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 text-center">
                    <ShieldAlert className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">Account Suspended</h1>
                    <p className="text-slate-400 mb-8 font-medium">Your access has been temporarily suspended by your firm administrator.</p>
                    <button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} className="w-full h-14 bg-white text-slate-900 font-black uppercase tracking-widest rounded-2xl">Return to Portal</button>
                </div>
            </div>
        );
    }

    // 3. Onboarding Check: First Login
    if (profile?.first_login_flag && location.pathname !== '/auth/welcome') {
        return <Navigate to="/auth/welcome" replace />;
    }

    // 4. Internal Session Check (Must have selected firm/role)
    if (!sessionLoading && !internalSession) {
        // If profile is active but no internal session, they likely cleared cookies or it expired
        // Send them to role selection/login
        return <Navigate to="/internal/login" replace />;
    }

    // 5. RBAC Guard: Check role requirement
    if (requiredRole && internalSession) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const normalizedUserRole = internalSession.role.toLowerCase();
        const normalizedRequiredRoles = roles.map(r => r.toLowerCase());

        // @ts-ignore
        if (!normalizedRequiredRoles.includes(normalizedUserRole)) {
            return <Navigate to="/auth/unauthorized" replace />;
        }
    }

    return <>{children}</>;
}
