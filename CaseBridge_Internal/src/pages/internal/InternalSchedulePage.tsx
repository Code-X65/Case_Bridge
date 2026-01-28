import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    Calendar, CheckCircle2, XCircle, Clock,
    Video, MapPin, Briefcase, User, Mail
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { useState } from 'react';

export default function InternalSchedulePage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Fetch Requests & Upcoming for this Lawyer
    const { data: meetings, isLoading } = useQuery({
        queryKey: ['lawyer_schedule', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('case_meetings')
                .select(`
                    *,
                    matter:case_id(title, id),
                    client:client_id(first_name, last_name, email)
                `)
                .eq('lawyer_user_id', session!.user_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        }
    });

    const updateStatus = useMutation({
        mutationFn: async ({ id, status, note, meetingLink, startTime, endTime }: any) => {
            const updatePayload: any = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'accepted') {
                updatePayload.confirmed_start = startTime;
                // Default 1 hour if not specified, though UI should enforce
                const end = new Date(startTime);
                end.setHours(end.getHours() + 1);
                updatePayload.confirmed_end = end.toISOString();

                updatePayload.video_provider = 'zoom';
                updatePayload.video_meeting_link = meetingLink || 'https://zoom.us/j/placeholder';
            } else if (status === 'rejected') {
                updatePayload.rejection_note = note;
            }

            const { error } = await supabase
                .from('case_meetings')
                .update(updatePayload)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lawyer_schedule'] });
            setProcessingId(null);
        }
    });

    const handleAccept = (meeting: any) => {
        // Simple prompt for now - could be a modal in v2
        const link = prompt("Enter Video Meeting Link (Zoom/Meet):", "https://zoom.us/j/123456789");
        if (!link) return;

        setProcessingId(meeting.id);
        updateStatus.mutate({
            id: meeting.id,
            status: 'accepted',
            meetingLink: link,
            startTime: meeting.proposed_start
        });
    };

    const handleReject = (meeting: any) => {
        const note = prompt("Enter Rejection Note (Optional):", "Scheduling conflict.");
        if (note === null) return;

        setProcessingId(meeting.id);
        updateStatus.mutate({
            id: meeting.id,
            status: 'rejected',
            note
        });
    };

    const pendingRequests = meetings?.filter((m: any) => m.status === 'requested') || [];
    const upcomingMeetings = meetings?.filter((m: any) => m.status === 'accepted' && new Date(m.confirmed_start) > new Date()) || [];

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />
            <main className="ml-64 p-10 max-w-7xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-black tracking-tight mb-2">My Schedule</h1>
                    <p className="text-slate-400 text-sm">Review incoming requests and manage your upcoming sessions.</p>
                </header>

                {isLoading ? (
                    <div className="flex justify-center p-20"><Calendar className="animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="space-y-12">
                        {/* PENDING REQUESTS */}
                        <section>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                Pending Requests ({pendingRequests.length})
                            </h2>

                            {pendingRequests.length === 0 ? (
                                <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-8 text-center text-slate-500 italic text-sm">
                                    No pending requests.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {pendingRequests.map((req: any) => (
                                        <div key={req.id} className="bg-[#1E293B] border border-l-4 border-yellow-500 rounded-2xl p-6 shadow-lg relative overflow-hidden">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-widest mb-1">
                                                        <Clock size={12} /> Requested
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white">{new Date(req.proposed_start).toLocaleString()}</h3>
                                                </div>
                                                <div className="bg-white/5 p-2 rounded-lg">
                                                    {req.meeting_type === 'virtual' ? <Video className="text-indigo-400" /> : <MapPin className="text-emerald-400" />}
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-8">
                                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                                    <Briefcase size={14} className="text-slate-500" />
                                                    <span className="font-bold">{req.matter?.title}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                                    <User size={14} className="text-slate-500" />
                                                    <span>{req.client?.first_name} {req.client?.last_name}</span>
                                                </div>
                                                {req.client_note && (
                                                    <div className="bg-black/20 p-4 rounded-xl text-xs text-slate-400 italic">
                                                        "{req.client_note}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => handleAccept(req)}
                                                    disabled={!!processingId}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={16} /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req)}
                                                    disabled={!!processingId}
                                                    className="flex-1 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 py-3 rounded-xl font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-white/5 hover:border-red-500/20"
                                                >
                                                    <XCircle size={16} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* UPCOMING CONFIRMED */}
                        <section>
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                Upcoming Sessions
                            </h2>

                            <div className="space-y-4">
                                {upcomingMeetings.map((m: any) => (
                                    <div key={m.id} className="bg-[#1E293B] border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:border-indigo-500/30 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-white/5 rounded-xl border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                                                <span className="text-xs font-bold text-slate-500 uppercase">{new Date(m.confirmed_start).toLocaleString('default', { month: 'short' })}</span>
                                                <span className="text-2xl font-black text-white">{new Date(m.confirmed_start).getDate()}</span>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white mb-1">{m.matter?.title}</h3>
                                                <p className="text-sm text-slate-400 flex items-center gap-2">
                                                    <Clock size={12} /> {new Date(m.confirmed_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                                    {m.client?.first_name} {m.client?.last_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {m.video_meeting_link && (
                                                <a
                                                    href={m.video_meeting_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-4 py-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-600/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                                >
                                                    Launch Video
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {upcomingMeetings.length === 0 && (
                                    <p className="text-slate-500 text-sm italic">No upcoming confirmed meetings.</p>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
