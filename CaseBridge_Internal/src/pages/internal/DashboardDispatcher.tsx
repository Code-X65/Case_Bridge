import { useInternalSession } from '@/hooks/useInternalSession';
import AdminDashboard from './AdminDashboard';
import CaseManagerDashboard from './CaseManagerDashboard';
import AssociateDashboard from './AssociateDashboard';
import { Navigate } from 'react-router-dom';

export default function DashboardDispatcher() {
    const { session, isLoading } = useInternalSession();

    if (isLoading) return <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">Loading...</div>;

    if (!session) return <Navigate to="/internal/login" replace />;

    switch (session.role) {
        case 'admin_manager':
            return <AdminDashboard />;
        case 'case_manager':
            return <CaseManagerDashboard />;
        case 'associate_lawyer':
            return <AssociateDashboard />;
        default:
            return (
                <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-xl font-bold mb-2">Unknown Role</h1>
                        <p className="text-slate-400">Your role "{session.role}" is not recognized.</p>
                    </div>
                </div>
            );
    }
}
