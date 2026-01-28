import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Users, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function AdminDashboard() {
    const { session } = useInternalSession();
    const navigate = useNavigate();

    // Fetch Admin Profile
    const { data: profile } = useQuery({
        queryKey: ['admin_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session!.user_id)
                .single();
            return data;
        }
    });

    // Fetch Firm Stats (Count only)
    const { data: stats } = useQuery({
        queryKey: ['firm_stats', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { count } = await supabase
                .from('user_firm_roles')
                .select('*', { count: 'exact', head: true })
                .eq('firm_id', session!.firm_id);
            return { staffCount: count || 0 };
        }
    });

    // Fetch Firm Details
    const { data: firm } = useQuery({
        queryKey: ['firm_details', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase.from('firms').select('*').eq('id', session!.firm_id).single();
            return data;
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 min-h-screen max-w-5xl">
                {/* 1. Welcome Header */}
                <header className="mb-12">
                    <h1 className="text-4xl font-black tracking-tight mb-2">
                        Welcome back, <span className="text-indigo-400">{profile?.full_name || 'Admin'}</span>
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Here is what is happening with <strong className="text-white">{firm?.name}</strong> today.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 2. Firm Status Card */}
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ShieldCheck className="w-32 h-32" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest text-green-400">System Active</span>
                            </div>

                            <h3 className="text-2xl font-bold mb-1">{firm?.name}</h3>
                            <p className="text-slate-400 text-sm mb-6">Enterprise License</p>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-indigo-400" />
                                        <span className="text-sm font-medium text-slate-300">Total Staff</span>
                                    </div>
                                    <span className="text-xl font-bold text-white">{stats?.staffCount || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="w-5 h-5 text-green-400" />
                                        <span className="text-sm font-medium text-slate-300">Security</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-400">Healthy</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Getting Started Checklist */}
                    <div className="lg:col-span-2 bg-[#1E293B] border border-white/10 rounded-2xl p-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            Getting Started
                            <span className="text-xs font-normal text-slate-500 bg-white/5 px-2 py-1 rounded-full">3 Steps</span>
                        </h3>

                        <div className="space-y-4">
                            {/* Step 1: Invite Staff */}
                            <div className="flex items-start gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl relative group">
                                <div className="mt-1">
                                    {(stats?.staffCount || 0) > 1 ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                                    ) : (
                                        <Circle className="w-6 h-6 text-indigo-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white mb-1">Invite your first Case Manager</h4>
                                    <p className="text-sm text-slate-400 mb-4">Build your team to start managing cases efficiently.</p>

                                    {(stats?.staffCount || 0) <= 1 && (
                                        <button
                                            onClick={() => navigate('/internal/staff-management')}
                                            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                                        >
                                            Go to Staff Management <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Placeholder Steps */}
                            <div className="flex items-center gap-4 p-4 rounded-xl opacity-50">
                                <Circle className="w-6 h-6 text-slate-600" />
                                <div>
                                    <h4 className="font-bold text-slate-300">Complete Firm Profile</h4>
                                    <p className="text-sm text-slate-500">Add your logo and office details.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl opacity-50">
                                <Circle className="w-6 h-6 text-slate-600" />
                                <div>
                                    <h4 className="font-bold text-slate-300">Review Security Settings</h4>
                                    <p className="text-sm text-slate-500">Configure 2FA and session timeouts.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
