
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    User, Mail, Shield, CheckCircle2,
    Save, Loader2, Link as LinkIcon, Calendar,
    Phone, Globe, Video, Building2
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';

export default function ProfileSettings() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();

    // Editable state
    const [calendlyUrl, setCalendlyUrl] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [meetingType, setMeetingType] = useState<'virtual' | 'physical'>('virtual');

    // Fetch Profile
    const { data: profile, isLoading } = useQuery({
        queryKey: ['my_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, firm:user_firm_roles(firm:firm_id(name))')
                .eq('id', session!.user_id)
                .single();
            if (error) throw error;

            // Sync local state
            setCalendlyUrl(data.calendly_url || '');
            setPhoneNumber(data.phone_number || '');
            setTimezone(data.timezone || 'UTC');
            setMeetingType(data.preferred_meeting_type || 'virtual');

            return data;
        }
    });

    const firmName = (profile?.firm as any)?.[0]?.firm?.name || 'Loading...';

    const updateProfile = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    calendly_url: calendlyUrl,
                    phone_number: phoneNumber,
                    timezone: timezone,
                    preferred_meeting_type: meetingType
                })
                .eq('id', session!.user_id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my_profile', session?.user_id] });
            alert('Operational settings synchronized successfully.');
        }
    });

    if (isLoading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-12 max-w-4xl">
                <header className="mb-12">
                    <h1 className="text-4xl font-black mb-2">My Professional Profile</h1>
                    <p className="text-slate-400">Manage your identity and availability settings within CaseBridge.</p>
                </header>

                <div className="space-y-8">
                    {/* Basic Info */}
                    <section className="bg-[#1E293B] border border-white/10 rounded-3xl p-10">
                        <div className="flex justify-between items-start mb-8">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <User size={14} /> Authority Profile (Read-Only)
                            </h2>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{profile?.status || 'Active'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Legal Identity</label>
                                <p className="text-2xl font-bold text-white tracking-tight">{profile?.full_name}</p>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                    <Mail size={12} className="text-slate-500" /> {session?.email}
                                </p>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Organizational Context</label>
                                <p className="text-2xl font-bold text-slate-300 tracking-tight flex items-center gap-3">
                                    <Building2 size={24} className="text-slate-500" /> {firmName}
                                </p>
                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                    <Shield size={12} /> {session?.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Operational Coordination */}
                    <section className="bg-[#1E293B] border border-white/10 rounded-3xl p-10">
                        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                            <Globe size={14} /> Operational Coordination
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Direct Phone Line</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Operational Timezone</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <select
                                            value={timezone}
                                            onChange={e => setTimezone(e.target.value)}
                                            className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="UTC">UTC (Universal Coordinated)</option>
                                            <option value="America/New_York">EST (Eastern Standard)</option>
                                            <option value="America/Chicago">CST (Central Standard)</option>
                                            <option value="America/Denver">MST (Mountain Standard)</option>
                                            <option value="America/Los_Angeles">PST (Pacific Standard)</option>
                                            <option value="Europe/London">GMT (London)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Preferred Meeting Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setMeetingType('virtual')}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 ${meetingType === 'virtual' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-[#0F172A] border-white/5 text-slate-500 hover:border-white/10'}`}
                                    >
                                        <Video size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest text-left">Virtual Only</span>
                                    </button>
                                    <button
                                        onClick={() => setMeetingType('physical')}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 ${meetingType === 'physical' ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-[#0F172A] border-white/5 text-slate-500 hover:border-white/10'}`}
                                    >
                                        <Building2 size={20} />
                                        <span className="text-xs font-bold uppercase tracking-widest text-left">Physical/Office</span>
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 italic mt-2">
                                    This informs the default location settings for client-scheduled meetings.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Calendly Integration (Section 5) */}
                    {session?.role === 'associate_lawyer' && (
                        <section className="bg-[#1E293B] border border-white/10 rounded-3xl p-10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Calendar className="w-24 h-24 text-blue-400" />
                            </div>

                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                                <LinkIcon size={14} /> Scheduling Infrastructure
                            </h2>

                            <div className="max-w-xl">
                                <p className="text-slate-300 mb-6 leading-relaxed">
                                    To enable client-initiated meeting requests, provide your <strong className="text-white">Calendly Landing URL</strong>. This will be used to host secure time selection widgets within the client portal.
                                </p>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="url"
                                            placeholder="https://calendly.com/your-profile/session"
                                            value={calendlyUrl}
                                            onChange={e => setCalendlyUrl(e.target.value)}
                                            className="w-full bg-[#0F172A] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                        Only your public Calendly slug is shared with clients.
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Action Bar */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={() => updateProfile.mutate()}
                            disabled={updateProfile.isPending}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3 active:scale-[0.98]"
                        >
                            {updateProfile.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Synchronize Settings
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
