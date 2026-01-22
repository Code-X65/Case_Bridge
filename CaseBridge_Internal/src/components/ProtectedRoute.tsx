import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: 'admin_manager' | 'case_manager' | 'associate_lawyer' | ('admin_manager' | 'case_manager' | 'associate_lawyer')[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { data: session, isLoading: sessionLoading } = useQuery({
        queryKey: ['session'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        },
    });

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, firm_id, internal_role, status, first_name, last_name, email')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!session?.user?.id,
    });

    if (sessionLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600 font-medium">Authenticating...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (!profile) {
        return <Navigate to="/login" replace />;
    }

    // Check if user is internal user
    if (!profile.internal_role) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                    <h2 className="text-xl font-black text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-sm text-slate-600">This portal is for internal users only.</p>
                </div>
            </div>
        );
    }

    // Check if user is active
    if (profile.status !== 'active') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                    <h2 className="text-xl font-black text-slate-900 mb-2">Account {profile.status}</h2>
                    <p className="text-sm text-slate-600">
                        Your account has been {profile.status}. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    // Check role requirement
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(profile.internal_role as any)) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-sm text-slate-600">
                            You don't have permission to access this page.
                        </p>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
