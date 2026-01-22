import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Briefcase,
    Users,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    ArrowRight,
    Bell,
    Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

function StatCard({ title, value, icon: Icon, color, trend }: any) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-50',
        green: 'text-green-600 bg-green-50',
        amber: 'text-amber-600 bg-amber-50',
        indigo: 'text-indigo-600 bg-indigo-50',
        slate: 'text-slate-600 bg-slate-50',
    };

    const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.slate;

    return (
        <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${selectedColor}`}>
                    <Icon className="h-5 w-5" />
                </div>
                {trend && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        {trend}
                    </span>
                )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1">{title}</p>
        </div>
    );
}

function AssociateLawyerDashboard({ profile }: { profile: any }) {
    const { data: stats } = useQuery({
        queryKey: ['associate-stats', profile?.id],
        queryFn: async () => {
            // Fetch assignments
            const { count: assignedCount } = await supabase
                .from('case_assignments')
                .select('*', { count: 'exact', head: true })
                .eq('associate_id', profile.id);

            // Fetch active cases
            const { count: activeCount } = await supabase
                .from('matters')
                .select('*, assignments:case_assignments!inner(*)', { count: 'exact', head: true })
                .eq('assignments.associate_id', profile.id)
                .in('status', ['Active', 'In Progress', 'Assigned']);

            return {
                assigned: assignedCount || 0,
                active: activeCount || 0,
                completed: 0 // Placeholder
            };
        }
    });

    const { data: recentAssignments } = useQuery({
        queryKey: ['recent-assignments', profile?.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('matters')
                .select('*, assignments:case_assignments!inner(*)')
                .eq('assignments.associate_id', profile.id)
                .order('updated_at', { ascending: false })
                .limit(5);
            return data;
        }
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">
                    My Portfolio
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    Manage your assigned cases and tasks
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Assigned"
                    value={stats?.assigned || 0}
                    icon={Briefcase}
                    color="blue"
                />
                <StatCard
                    title="Active Cases"
                    value={stats?.active || 0}
                    icon={Clock}
                    color="indigo"
                />
                <StatCard
                    title="Tasks Pending"
                    value="0"
                    icon={CheckCircle2}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Assignments */}
                <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                            Recent Cases
                        </h2>
                        <Link to="/cases" className="text-xs font-semibold text-primary hover:text-primary/80">
                            View All
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentAssignments?.map((matter: any) => (
                            <div key={matter.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{matter.title}</p>
                                    <p className="text-xs text-slate-500">{matter.matter_number}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 text-[10px] font-semibold uppercase rounded-md ${matter.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {matter.status}
                                    </span>
                                    <Link to={`/cases/${matter.id}`} className="text-slate-400 hover:text-primary">
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                        {(!recentAssignments || recentAssignments.length === 0) && (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                No recent cases found.
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-900 rounded-md p-6 text-white space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold uppercase tracking-tight">Quick Actions</h2>
                        <p className="text-slate-400 text-sm mt-1">Common tasks for your workflow</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Link to="/cases" className="bg-white/10 hover:bg-white/20 p-4 rounded-md transition-colors text-center group">
                            <FileText className="h-6 w-6 mx-auto mb-2 text-blue-400 group-hover:text-blue-300" />
                            <p className="text-xs font-bold uppercase tracking-wide">Submit Report</p>
                        </Link>
                        <Link to="/profile" className="bg-white/10 hover:bg-white/20 p-4 rounded-md transition-colors text-center group">
                            <Users className="h-6 w-6 mx-auto mb-2 text-indigo-400 group-hover:text-indigo-300" />
                            <p className="text-xs font-bold uppercase tracking-wide">My Profile</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ManagerDashboard({ profile }: { profile: any }) {
    const { data: stats } = useQuery({
        queryKey: ['manager-stats'],
        queryFn: async () => {
            const { count: totalCases } = await supabase.from('matters').select('*', { count: 'exact', head: true });
            const { count: pendingCases } = await supabase.from('matters').select('*', { count: 'exact', head: true }).eq('status', 'Pending Review');
            const { count: activeCases } = await supabase.from('matters').select('*', { count: 'exact', head: true }).in('status', ['Active', 'In Progress', 'Assigned']);

            return { total: totalCases || 0, pending: pendingCases || 0, active: activeCases || 0 };
        }
    });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">
                    Firm Overview
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">
                    {profile.internal_role === 'admin_manager' ? 'Administration & Operations' : 'Case Management Dashboard'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Matters"
                    value={stats?.total || 0}
                    icon={Briefcase}
                    color="slate"
                />
                <StatCard
                    title="Pending Review"
                    value={stats?.pending || 0}
                    icon={AlertCircle}
                    color="amber"
                />
                <StatCard
                    title="Active Cases"
                    value={stats?.active || 0}
                    icon={TrendingUp}
                    color="green"
                    trend="+12%"
                />
                {profile.internal_role === 'admin_manager' && (
                    <StatCard
                        title="Audit Issues"
                        value="0"
                        icon={Shield}
                        color="indigo"
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                Team Performance
                            </h2>
                        </div>
                        <button className="text-xs font-bold text-slate-400 hover:text-slate-600">View Report</button>
                    </div>
                    <div className="bg-slate-50 rounded-md p-8 text-center border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">Performance metrics visualization coming soon.</p>
                    </div>
                </div>

                <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 rounded-md flex items-center justify-center">
                                <Bell className="h-4 w-4 text-amber-600" />
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                Recent Alerts
                            </h2>
                        </div>
                        <Link to="/notifications" className="text-xs font-bold text-primary hover:text-primary/80">View All</Link>
                    </div>
                    <div className="space-y-4">
                        {/* Placeholder alerts */}
                        <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-md">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-900">New Case Submitted</p>
                                <p className="text-[10px] text-slate-500">Client #1289 submitted a new case for review.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start p-3 bg-slate-50 rounded-md">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-slate-900">Payment Received</p>
                                <p className="text-[10px] text-slate-500">Invoice #INV-2024-001 has been paid.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { data: profile, isLoading } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            return data;
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (profile?.internal_role === 'associate_lawyer') {
        return <AssociateLawyerDashboard profile={profile} />;
    }

    return <ManagerDashboard profile={profile} />;
}
