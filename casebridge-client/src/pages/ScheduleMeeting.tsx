
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar, ArrowLeft, Video, MapPin,
    CheckCircle2, Shield, Loader2, Send
} from 'lucide-react';
import ClientLayout from '../components/ClientLayout';

type MeetingType = 'virtual' | 'physical';

export default function ScheduleMeeting() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [matter, setMatter] = useState<any>(null);
    const [meetingType, setMeetingType] = useState<MeetingType>('virtual');

    // Request State
    const [proposedDate, setProposedDate] = useState('');
    const [proposedTime, setProposedTime] = useState('');
    const [clientNote, setClientNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchMatter() {
            if (!id) return;
            // Fetch matter info
            const { data, error } = await supabase
                .from('matters')
                .select(`
                    id, title, lifecycle_state, firm_id, client_id, assigned_associate,
                    assignee:assigned_associate ( id, full_name )
                `)
                .eq('case_report_id', id)
                .single();

            if (error || !data) {
                // Fallback direct ID check
                const { data: d2 } = await supabase.from('matters').select('*, assignee:assigned_associate(*)').eq('id', id).single();
                if (d2) { setMatter(d2); setLoading(false); return; }

                console.error("Error fetching matter:", error);
                navigate('/cases');
                return;
            }

            // Section 3 Eligibility
            const allowedStates = ['under_review', 'in_progress'];
            if (!allowedStates.includes(data.lifecycle_state) || !data.assigned_associate) {
                alert("This case is not currently eligible for scheduling.");
                navigate(`/cases/${id}`);
                return;
            }

            setMatter(data);
            setLoading(false);
        }
        fetchMatter();
    }, [id, navigate]);

    const handleRequestMeeting = async () => {
        if (!proposedDate || !proposedTime) return;
        setSubmitting(true);

        try {
            // Combine date and time for proposed_start
            const startDateTime = new Date(`${proposedDate}T${proposedTime}`);

            const { error } = await supabase.from('case_meetings').insert({
                case_id: matter.id,
                client_id: matter.client_id, // RLS checks this matches auth.uid
                lawyer_user_id: matter.assigned_associate,
                meeting_type: meetingType,
                proposed_start: startDateTime.toISOString(),
                client_note: clientNote,
                status: 'requested',
                created_at: new Date().toISOString()
            });

            if (error) throw error;
            setStep(4);
        } catch (err) {
            console.error("Scheduling error:", err);
            alert("Failed to submit request. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <ClientLayout>
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            </ClientLayout>
        );
    }

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto py-10 px-6">
                <header className="mb-10">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm font-bold">
                        <ArrowLeft className="w-4 h-4" /> Cancel Request
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white">Request Case Meeting</h1>
                            <p className="text-slate-400 text-sm">Coordinate a session with your assigned lawyer.</p>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mt-8">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/5'}`} />
                        ))}
                    </div>
                </header>

                <div className="glass-card p-10 relative overflow-hidden">
                    {/* STEP 1: CONTEXT */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-black mb-8 underline decoration-blue-500/30 underline-offset-8">Step 1 — Verify Context</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Subject Case</label>
                                        <p className="text-xl font-bold border-l-4 border-blue-500 pl-4">{matter.title}</p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Assigned Counsel</label>
                                        <p className="text-xl font-bold">{matter.assignee?.full_name}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-2xl flex gap-4 items-start mb-10">
                                <Shield className="w-6 h-6 text-blue-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-blue-500 mb-1 leading-none uppercase tracking-tighter">Process Note</p>
                                    <p className="text-sm text-blue-500/70 italic leading-relaxed">
                                        Per firm policy, meetings are requested by clients and confirmed by counsel based on availability. This request does not create a billable event until confirmed.
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setStep(2)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-blue-500/20">
                                Acknowledge & Continue
                            </button>
                        </div>
                    )}

                    {/* STEP 2: TYPE */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-black mb-8 underline decoration-blue-500/30 underline-offset-8">Step 2 — Preference</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                <button onClick={() => setMeetingType('virtual')} className={`p-10 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${meetingType === 'virtual' ? 'border-blue-500 bg-blue-500/5 shadow-2xl' : 'border-white/5 hover:border-white/20'}`}>
                                    <Video className={`w-10 h-10 mb-6 ${meetingType === 'virtual' ? 'text-blue-500' : 'text-slate-600'}`} />
                                    <h3 className="text-xl font-bold mb-2">Virtual Session</h3>
                                    <p className="text-sm text-slate-500">Video conference via secure firm platform.</p>
                                    {meetingType === 'virtual' && <CheckCircle2 className="absolute top-6 right-6 text-blue-500 w-6 h-6" />}
                                </button>
                                <button onClick={() => setMeetingType('physical')} className={`p-10 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${meetingType === 'physical' ? 'border-blue-500 bg-blue-500/5 shadow-2xl' : 'border-white/5 hover:border-white/20'}`}>
                                    <MapPin className={`w-10 h-10 mb-6 ${meetingType === 'physical' ? 'text-blue-500' : 'text-slate-600'}`} />
                                    <h3 className="text-xl font-bold mb-2">Physical Meeting</h3>
                                    <p className="text-sm text-slate-500">In-person at firm offices.</p>
                                    {meetingType === 'physical' && <CheckCircle2 className="absolute top-6 right-6 text-blue-500 w-6 h-6" />}
                                </button>
                            </div>
                            <button onClick={() => setStep(3)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-blue-500/20">
                                Continue
                            </button>
                        </div>
                    )}

                    {/* STEP 3: DETAILS */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-black mb-8 underline decoration-blue-500/30 underline-offset-8">Step 3 — Details</h2>
                            <div className="space-y-6 mb-10">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Preferred Date</label>
                                    <input
                                        type="date"
                                        value={proposedDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setProposedDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Preferred Time Window</label>
                                    <input
                                        type="time"
                                        value={proposedTime}
                                        onChange={e => setProposedTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">Topic / Questions (Optional)</label>
                                    <textarea
                                        value={clientNote}
                                        onChange={e => setClientNote(e.target.value)}
                                        placeholder="Briefly describe what you'd like to discuss..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                                    />
                                </div>
                            </div>
                            <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-xl mb-8">
                                <p className="text-xs text-yellow-500/80 italic">
                                    "Meeting requests are subject to lawyer availability and do not create a lawyer–client relationship."
                                </p>
                            </div>
                            <button
                                onClick={handleRequestMeeting}
                                disabled={submitting || !proposedDate || !proposedTime}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                                Submit Request
                            </button>
                        </div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="animate-in zoom-in-95 duration-500 text-center py-10">
                            <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-500 border border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <h2 className="text-4xl font-black mb-4">Request Sent</h2>
                            <p className="text-slate-400 max-w-sm mx-auto mb-12">
                                Your meeting request has been submitted to <span className="text-white font-bold">{matter?.assignee?.full_name}</span>. You will receive a notification when the time is confirmed.
                            </p>
                            <button onClick={() => navigate(`/cases/${id}`)} className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all border border-white/10">
                                Return to Case Dossier
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ClientLayout>
    );
}
