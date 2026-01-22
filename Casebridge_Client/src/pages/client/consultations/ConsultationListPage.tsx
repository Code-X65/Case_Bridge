import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import {
    Card,
    CardContent,
    CardHeader
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Video,
    MapPin,
    Calendar as CalendarIcon,
    MoreVertical,
    CalendarCheck,
    History
} from 'lucide-react';
import { BookConsultationDialog } from '@/components/consultations/BookConsultationDialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function ConsultationListPage() {
    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments'],
        queryFn: async () => {
            // Get current authenticated user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch only appointments belonging to the current user
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('client_id', user.id)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;
            return data;
        },
    });

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'scheduled':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'completed':
                return 'bg-green-50 text-green-700 border-green-100';
            case 'cancelled':
                return 'bg-red-50 text-red-700 border-red-100';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const upcomingAppointments = appointments?.filter(app =>
        new Date(app.scheduled_at) >= new Date() && app.status !== 'Cancelled'
    );

    const pastAppointments = appointments?.filter(app =>
        new Date(app.scheduled_at) < new Date() || app.status === 'Cancelled'
    );

    return (
        <div className="space-y-8 pb-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase tracking-tighter">Consultations</h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Schedule and manage legal advice sessions.
                    </p>
                </div>
                <BookConsultationDialog />
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-base font-black flex items-center gap-2 text-slate-900 uppercase tracking-tight">
                        <CalendarCheck className="h-4 w-4 text-primary" />
                        Upcoming Sessions
                    </h2>
                    {upcomingAppointments && upcomingAppointments.length > 0 && (
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase h-5 px-2">
                            {upcomingAppointments.length} Active
                        </Badge>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl border border-slate-100 shadow-sm" />
                        ))}
                    </div>
                ) : !upcomingAppointments || upcomingAppointments.length === 0 ? (
                    <Card className="border-none ring-2 ring-slate-100 ring-dashed bg-slate-100/10 rounded-3xl">
                        <CardContent className="py-16 text-center space-y-3">
                            <div className="bg-white p-3 rounded-xl shadow-sm w-fit mx-auto border border-slate-50">
                                <CalendarIcon className="h-8 w-8 text-slate-200" />
                            </div>
                            <div className="max-w-xs mx-auto">
                                <p className="text-slate-950 font-black text-sm uppercase tracking-widest">No scheduled sessions</p>
                                <p className="text-slate-400 text-[10px] font-bold mt-1 uppercase leading-tight tracking-tighter">Need expert advice? Standard response time is 2 hours.</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingAppointments.map((app) => (
                            <Card key={app.id} className="group border-none ring-1 ring-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden bg-white">
                                <CardHeader className="pb-2 px-5 pt-4 flex flex-row items-center justify-between space-y-0">
                                    <Badge variant="outline" className={`${getStatusStyles(app.status)} px-2 py-0 border font-black uppercase text-[8px] tracking-widest h-4 rounded-sm`}>
                                        {app.status}
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="px-5 pb-5 space-y-4">
                                    <div className="space-y-1 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {format(new Date(app.scheduled_at), 'MMM do, yyyy')}
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                            {format(new Date(app.scheduled_at), 'h:mm')}
                                            <span className="text-sm ml-0.5 font-bold text-slate-400">{format(new Date(app.scheduled_at), 'a')}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100/50">
                                        {app.appointment_type === 'Virtual' ? (
                                            <Video className="h-3.5 w-3.5 text-primary" />
                                        ) : (
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                        )}
                                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{app.appointment_type}</span>
                                    </div>

                                    <Button className="w-full bg-slate-950 hover:bg-slate-900 text-white rounded-lg h-9 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-100 border-b-2 border-primary">
                                        Connect
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            <Separator className="bg-slate-100" />

            {pastAppointments && pastAppointments.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-base font-black flex items-center gap-2 text-slate-400 uppercase tracking-tight px-2">
                        <History className="h-4 w-4" />
                        Activity Log
                    </h2>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ring-1 ring-slate-100">
                        <div className="divide-y divide-slate-50">
                            {pastAppointments.map((app) => (
                                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                            {app.appointment_type === 'Virtual' ? <Video className="h-4 w-4 text-slate-300" /> : <MapPin className="h-4 w-4 text-slate-300" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{app.appointment_type} Session</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">{format(new Date(app.scheduled_at), 'PPP')} • {format(new Date(app.scheduled_at), 'p')}</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`${getStatusStyles(app.status)} px-2 py-0 border uppercase text-[8px] font-black tracking-widest h-4 rounded-sm`}>
                                        {app.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
