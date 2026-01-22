import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Plus,
    Clock,
    Gavel,
    Calendar,
    CreditCard,
    ArrowRight,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import ClientActivityTimeline from '@/components/cases/ClientActivityTimeline';

export default function DashboardPage() {
    const { data: profile } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            return data;
        },
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only data belonging to the current user
            const { data: matters } = await supabase
                .from('matters')
                .select('id, status, title, created_at, matter_number')
                .eq('client_id', user.id);

            const { data: appointments } = await supabase
                .from('appointments')
                .select('*')
                .eq('client_id', user.id)
                .order('scheduled_at', { ascending: true });

            const { data: invoices } = await supabase
                .from('invoices')
                .select('id')
                .eq('client_id', user.id)
                .eq('status', 'Pending');

            const { data: recentActivity } = await supabase
                .from('case_logs')
                .select(`
                    *,
                    matter:matters(title)
                `)
                .in('matter_id', matters?.map(m => m.id) || [])
                .order('created_at', { ascending: false })
                .limit(10);

            return {
                activeMatters: matters?.filter(m => m.status !== 'Closed').length || 0,
                upcomingConsultations: appointments?.filter(a => new Date(a.scheduled_at) >= new Date()).length || 0,
                pendingInvoices: invoices?.length || 0,
                recentMatters: matters?.slice(0, 5) || [],
                upcomingAppointments: appointments?.filter(a => new Date(a.scheduled_at) >= new Date()).slice(0, 3) || [],
                recentActivity: recentActivity || [],
            };
        },
    });

    const summaryCards = [
        {
            title: 'Active Cases',
            value: stats?.activeMatters || 0,
            icon: Gavel,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Upcoming Sessions',
            value: stats?.upcomingConsultations || 0,
            icon: Calendar,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            title: 'Pending Bills',
            value: stats?.pendingInvoices || 0,
            icon: CreditCard,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'pending review': return 'bg-amber-100/50 text-amber-700 border-amber-100';
            case 'active': return 'bg-blue-100/50 text-blue-700 border-blue-100';
            case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 pb-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 line-height-tight uppercase tracking-tighter">
                        Welcome, {profile?.first_name || 'Client'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Overview of your current legal status and appointments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-xl font-bold h-10 border-slate-200">
                        <Link to="/client/consultations">Book Session</Link>
                    </Button>
                    <Button asChild size="sm" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10 rounded-xl font-bold h-10 px-5 group">
                        <Link to="/client/matters/create">
                            <Plus className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform" />
                            New Case
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summaryCards.map((card) => (
                    <Card key={card.title} className="border-none shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-slate-100 rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-5 pt-5">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {card.title}
                            </CardTitle>
                            <div className={`${card.bg} p-1.5 rounded-lg`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <div className="text-2xl font-black text-slate-900">
                                {statsLoading ? '...' : card.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Matters */}
                <Card className="lg:col-span-2 border-none ring-1 ring-slate-100 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 bg-slate-50/30 py-4 px-6">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900">Recent Cases</CardTitle>
                            <CardDescription className="text-xs">Your latest legal submissions.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary hover:bg-primary/5 font-bold h-8 text-xs">
                            <Link to="/client/matters">
                                View All Cases <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {statsLoading ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Synchronizing...</div>
                        ) : !stats?.recentMatters || stats.recentMatters.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                                <Clock className="h-8 w-8 opacity-10 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">No active cases</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {stats.recentMatters.map((matter: any) => (
                                    <Link
                                        key={matter.id}
                                        to={`/client/matters/${matter.id}`}
                                        className="group block p-5 hover:bg-slate-50 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight">
                                                        {matter.title}
                                                    </p>
                                                    <Badge variant="outline" className={`${getStatusColor(matter.status)} border px-1.5 py-0 text-[9px] font-black uppercase tracking-widest h-4 rounded-sm`}>
                                                        {matter.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-mono font-bold tracking-tighter">{matter.matter_number}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-500">{new Date(matter.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Recent Activity */}
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4 px-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-900">Activity</CardTitle>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" asChild>
                                <Link to="/client/notifications">
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ClientActivityTimeline logs={stats?.recentActivity || []} />
                        </CardContent>
                    </Card>

                    {/* Upcoming Appointments */}
                    <Card className="border-none ring-1 ring-slate-100 shadow-sm rounded-3xl overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-50 py-4 px-6">
                            <CardTitle className="text-base font-bold text-slate-900">Upcoming sessions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {statsLoading ? (
                                <div className="p-6 text-center text-slate-400 text-xs">Loading sessions...</div>
                            ) : !stats?.upcomingAppointments || stats.upcomingAppointments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                                    <Calendar className="h-8 w-8 text-slate-100" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No sessions</p>
                                    <Button size="sm" variant="outline" asChild className="h-8 text-[10px] font-black rounded-lg uppercase border-slate-100">
                                        <Link to="/client/consultations">Schedule Now</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {stats.upcomingAppointments.map((app: any) => (
                                        <div key={app.id} className="p-3 rounded-2xl border border-slate-50 bg-white hover:bg-slate-50/50 transition-all flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-slate-950 flex flex-col items-center justify-center text-white shrink-0 shadow-sm border-b-2 border-primary">
                                                <span className="text-[8px] font-black uppercase tracking-widest opacity-60 leading-none">{new Date(app.scheduled_at).toLocaleString('en-US', { month: 'short' })}</span>
                                                <span className="text-sm font-black mt-0.5">{new Date(app.scheduled_at).getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-900 truncate uppercase tracking-tight">
                                                    {app.appointment_type} Session
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold">{new Date(app.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="link" className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest h-8" asChild>
                                        <Link to="/client/consultations">View All Sessions</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/10 rounded-xl border border-white/10 shrink-0">
                                <AlertCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Emergency Line</p>
                                <p className="text-xs font-bold leading-relaxed opacity-90">Need immediate legal attention? Our priority desk is open 24/7 for active cases.</p>
                                <p className="text-sm font-black mt-2 text-white">+234 (0) 800-CASE-BRIDGE</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
