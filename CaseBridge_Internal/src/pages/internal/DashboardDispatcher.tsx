import { useInternalSession } from '@/hooks/useInternalSession';
import AdminDashboard from './AdminDashboard';
import CaseManagerDashboard from './CaseManagerDashboard';
import AssociateDashboard from './AssociateDashboard';
import { Navigate } from 'react-router-dom';
import Skeleton from '@/components/ui/Skeleton';

export default function DashboardDispatcher() {
    const { session, isLoading } = useInternalSession();

    if (isLoading) return (
        <div className="min-h-screen p-10 bg-[#0F172A]">
            <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                 <Skeleton className="w-64 h-10" />
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <Skeleton className="h-32 w-full" />
                     <Skeleton className="h-32 w-full" />
                     <Skeleton className="h-32 w-full" />
                 </div>
                 <Skeleton className="h-[400px] w-full" />
            </div>
        </div>
    );

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
