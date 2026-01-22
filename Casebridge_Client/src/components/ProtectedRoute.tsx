import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = () => {
    const { session, isInternal, loading } = useAuth();

    console.log('🛡️ ProtectedRoute:', { loading, hasSession: !!session, isInternal });

    if (loading) {
        console.log('🛡️ ProtectedRoute: Still loading, showing spinner');
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-sm font-medium text-slate-600">Verifying session...</p>
            </div>
        );
    }

    if (!session) {
        console.log('🛡️ ProtectedRoute: No session, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    if (isInternal) {
        console.log('🛡️ ProtectedRoute: Internal user detected, blocking access');
        // Prevent access for internal staff to the client portal
        return <Navigate to="/login" replace state={{
            error: "This portal is for clients only. Internal staff should use the internal operations platform."
        }} />;
    }

    console.log('🛡️ ProtectedRoute: Access granted, rendering protected content');
    return <Outlet />;
};
