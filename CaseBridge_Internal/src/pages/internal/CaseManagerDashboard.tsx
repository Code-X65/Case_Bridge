import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
    Briefcase, Activity, CalendarClock, Plus,
    ArrowRight, Clock
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function CaseManagerDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    const { data: profile } = useQuery({
        queryKey: ['case_manager_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('full_name').eq('id', session!.user_id).single();
            return data;
        }
    });

    // Fetch Workload Specs (Aggregated counts)
    const { data: stats } = useQuery({
        queryKey: ['cm_workload', session?.firm_id, session?.user_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            // These would normally be real queries. For V1 we can mock or use placeholder queries if tables aren't ready.
            // Assuming 'matters' table exists or will exist. If not, we return 0.
            const { count: mattersCount } = await supabase
                .from('matters')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', session!.firm_id); // Case managers see all firm matters typically, or just theirs? 
            // Prompt says "Workload Summary... Pending Reviews, Active Matters". 
            // Let's assume Active Matters is the main count.

            return {
                activeMatters: mattersCount || 0,
                pendingReviews: 3, // Mocked for V1 as per "Intentional Placeholders" where data is missing
                upcomingDeadlines: 5
            };
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-5xl">
                {/* 1. Welcome Header */}
                <header className="mb-12 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight mb-2">
                            Welcome back, <span className="text-indigo-400">{profile?.full_name || 'Case Manager'}</span>
                        </h1>
                        <p className="text-slate-400 text-lg">
                            You have <strong className="text-white">{stats?.activeMatters || 0} active matters</strong> requiring attention.
                        </p>
                    </div>
                </header>

                {/* 2. Workload Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity className="w-24 h-24" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Pending Reviews</p>
                        <p className="text-4xl font-black text-yellow-400">{stats?.pendingReviews || 0}</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Briefcase className="w-24 h-24" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Active Matters</p>
                        <p className="text-4xl font-black text-indigo-400">{stats?.activeMatters || 0}</p>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CalendarClock className="w-24 h-24" />
                        </div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Upcoming Deadlines</p>
                        <p className="text-4xl font-black text-red-400">{stats?.upcomingDeadlines || 0}</p>
                    </div>
                </div>

                {/* 3. Primary Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                            <Plus className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Create New Matter</h3>
                        <p className="text-slate-400 text-sm mb-6">Start a new legal matter, assign clients, and set initial deadlines.</p>
                        <button
                            onClick={() => navigate('/internal/case-manager/matters')}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Open Intake Form <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-400 mb-6">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Review Pending Matters</h3>
                        <p className="text-slate-400 text-sm mb-6">You have {stats?.pendingReviews || 0} matters waiting for your initial review.</p>
                        <button
                            onClick={() => navigate('/internal/case-manager/matters')} // Filters could be added here
                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10"
                        >
                            Go to Pending Queue <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
