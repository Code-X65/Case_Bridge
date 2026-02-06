import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    Calendar, CheckCircle2, XCircle, Clock,
    Video, MapPin, Briefcase, User, Mail, X, Save, AlertCircle
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { useState } from 'react';

export default function InternalSchedulePage() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Modal State
    const [activeMeeting, setActiveMeeting] = useState<any>(null);
    const [modalType, setModalType] = useState<'accept' | 'reschedule' | null>(null);
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        link: '',
        note: ''
    });

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
        mutationFn: async ({ id, status, note, meetingLink, startTime }: any) => {
            const updatePayload: any = {
                status,
                updated_at: new Date().toISOString()
            };

            if (status === 'accepted') {
                updatePayload.confirmed_start = startTime;
                const end = new Date(startTime);
                end.setHours(end.getHours() + 1);
                updatePayload.confirmed_end = end.toISOString();

                updatePayload.video_provider = 'zoom';
                updatePayload.video_meeting_link = meetingLink || 'https://zoom.us/j/placeholder';
            } else if (status === 'requested') {
                updatePayload.proposed_start = startTime;
                updatePayload.internal_note = note;
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
            closeModal();
        }
    });

    const openModal = (meeting: any, type: 'accept' | 'reschedule') => {
        const dateObj = new Date(meeting.proposed_start || meeting.confirmed_start);
        setActiveMeeting(meeting);
        setModalType(type);
        setFormData({
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toTimeString().slice(0, 5),
            link: meeting.video_meeting_link || 'https://zoom.us/j/123456789',
            note: meeting.rejection_note || 'Suggested a better time for our team.'
        });
    };

    const closeModal = () => {
        setActiveMeeting(null);
        setModalType(null);
    };

    const handleSubmit = () => {
        if (!activeMeeting) return;
        const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();

        setProcessingId(activeMeeting.id);
        updateStatus.mutate({
            id: activeMeeting.id,
            status: modalType === 'accept' ? 'accepted' : 'requested',
            meetingLink: formData.link,
            startTime,
            note: formData.note
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
                    <p className="text-slate-400 text-sm">Coordinate sessions with your clients. Meetings cannot be rejected, only rescheduled.</p>
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
                                        <div key={req.id} className="bg-[#1E293B] border border-l-4 border-yellow-500 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                                                <Calendar size={80} />
                                            </div>
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs uppercase tracking-widest mb-1">
                                                        <Clock size={12} /> Requested
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white">{new Date(req.proposed_start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</h3>
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

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => openModal(req, 'accept')}
                                                    disabled={!!processingId}
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={14} /> Accept Request
                                                </button>
                                                <button
                                                    onClick={() => openModal(req, 'reschedule')}
                                                    disabled={!!processingId}
                                                    className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 border border-indigo-500/20"
                                                >
                                                    <Calendar size={14} /> Reschedule
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

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openModal(m, 'reschedule')}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                            >
                                                Reschedule
                                            </button>
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

            {/* NICE RESCHEDULE MODAL */}
            {activeMeeting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-[#1E293B] w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-indigo-500/10 to-transparent">
                            <div>
                                <h2 className="text-xl font-black">{modalType === 'accept' ? 'Confirm Meeting' : 'Propose New Time'}</h2>
                                <p className="text-xs text-slate-400 mt-1">{activeMeeting.matter?.title}</p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proposed Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proposed Time</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {modalType === 'accept' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Video Meeting Link (Zoom/Google)</label>
                                    <div className="relative">
                                        <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="url"
                                            value={formData.link}
                                            onChange={e => setFormData({ ...formData, link: e.target.value })}
                                            placeholder="https://zoom.us/j/..."
                                            className="w-full bg-[#0F172A] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            {modalType === 'reschedule' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for Rescheduling</label>
                                    <textarea
                                        value={formData.note}
                                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                                        className="w-full bg-[#0F172A] border border-white/5 rounded-xl px-4 py-4 text-sm h-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        placeholder="Briefly explain why the original time doesn't work..."
                                    />
                                    <p className="text-[10px] text-slate-500 italic flex items-center gap-1">
                                        <AlertCircle size={10} /> This note will be visible to the client in their portal.
                                    </p>
                                </div>
                            )}
                        </div>

                        <footer className="p-8 bg-[#0F172A]/50 border-t border-white/5 flex gap-4">
                            <button onClick={closeModal} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!!processingId}
                                className={`flex-2 px-8 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${modalType === 'accept' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'}`}
                            >
                                {processingId ? <Clock className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {modalType === 'accept' ? 'Confirm & Notify' : 'Update Proposal'}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
}
