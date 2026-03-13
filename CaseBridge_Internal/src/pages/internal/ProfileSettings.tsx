
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    User, Mail, Shield, CheckCircle2,
    Save, Loader2, Link as LinkIcon, Calendar,
    Phone, Globe, Video, Building2, ChevronDown,
    RefreshCw, X, ArrowRightLeft, Clock
} from 'lucide-react';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { useToast } from '@/components/common/ToastService';
import Skeleton from '@/components/ui/Skeleton';
import CalendarSelector from '@/components/calendar/CalendarSelector';

export default function ProfileSettings() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Editable state
    const [calendlyUrl, setCalendlyUrl] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [timezone, setTimezone] = useState('UTC');
    const [meetingType, setMeetingType] = useState<'virtual' | 'physical'>('virtual');

    // Calendar modal state
    const [isCalendarSelectorOpen, setIsCalendarSelectorOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook'>('google');
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');

    // OAuth callback handling
    useEffect(() => {
        // Check for OAuth callback errors in URL
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const errorCode = urlParams.get('error_code');
            const errorDescription = urlParams.get('error_description');

            if (errorCode) {
                toast(`Calendar connection failed: ${errorDescription || errorCode}`, 'error');
                // Clear URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Check for successful OAuth by checking hash params or checking for new identity
            if (window.location.hash || urlParams.get('access_token')) {
                // OAuth redirect completed, refresh connections
                queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
            }
        };

        handleOAuthCallback();
    }, [queryClient, toast]);

    // Fetch Profile
    const { data: profile, isLoading } = useQuery({
        queryKey: ['my_profile', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('profiles')
                .select('*, user_firm_roles(role, firm_id, firms(name))')
                .eq('id', session!.user_id)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;

            // Sync local state
            setCalendlyUrl(data.calendly_url || '');
            setPhoneNumber(data.phone_number || '');
            setTimezone(data.timezone || 'UTC');
            setMeetingType(data.preferred_meeting_type || 'virtual');

            return { ...data, email: user?.email };
        }
    });

    const firmName = (profile?.firm as any)?.[0]?.firm?.name || 'Loading...';

    // Fetch Calendar Connections
    const { data: connections } = useQuery({
        queryKey: ['calendar_connections', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('user_calendar_connections')
                .select('*')
                .eq('user_id', session!.user_id);
            return data || [];
        }
    });

    const isConnected = (provider: string) => connections?.some(c => c.provider === provider);
    const getConnection = (provider: string) => connections?.find(c => c.provider === provider);

    // Connect Calendar (OAuth) - using 'azure' for Outlook
    const connectCalendar = useMutation({
        mutationFn: async (provider: 'google' | 'azure') => {
            // Use Supabase's linkIdentity for OAuth flow
            // Note: Supabase uses 'azure' for Outlook/Office365
            const { error } = await supabase.auth.linkIdentity({
                provider: provider,
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    scopes: provider === 'google'
                        ? 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
                        : 'Calendars.ReadWrite Offline_access'
                }
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Calendar connected successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Error connecting calendar: ${error.message}`, 'error');
        }
    });

    // Disconnect Calendar
    const disconnectCalendar = useMutation({
        mutationFn: async (connectionId: string) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .delete()
                .eq('id', connectionId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Calendar disconnected', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Error disconnecting calendar: ${error.message}`, 'error');
        }
    });

    // Update sync direction
    const updateSyncDirection = useMutation({
        mutationFn: async ({ connectionId, syncDirection }: { connectionId: string; syncDirection: 'outbound' | 'inbound' | 'both' }) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .update({ 
                    sync_direction: syncDirection,
                    updated_at: new Date().toISOString()
                })
                .eq('id', connectionId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Sync direction updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Error updating sync direction: ${error.message}`, 'error');
        }
    });

    // Toggle sync enabled
    const toggleSyncEnabled = useMutation({
        mutationFn: async ({ connectionId, syncEnabled }: { connectionId: string; syncEnabled: boolean }) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .update({ 
                    sync_enabled: syncEnabled,
                    updated_at: new Date().toISOString()
                })
                .eq('id', connectionId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Sync settings updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Error updating sync settings: ${error.message}`, 'error');
        }
    });

    // Trigger manual sync
    const triggerSync = useMutation({
        mutationFn: async (connectionId: string) => {
            const connection = getConnection(connectionId);
            if (!connection) throw new Error('Connection not found');

            const { error } = await supabase.functions.invoke('calendar-sync', {
                body: { 
                    user_id: session?.user_id, 
                    provider: connection.provider,
                    connection_id: connectionId
                }
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Sync triggered successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Sync failed: ${error.message}`, 'error');
        }
    });

    // Open calendar selector modal
    const openCalendarSelector = (provider: 'google' | 'outlook', connectionId: string) => {
        setSelectedProvider(provider);
        setSelectedConnectionId(connectionId);
        setIsCalendarSelectorOpen(true);
    };

    // Handle calendar selection
    const handleCalendarSelect = () => {
        queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
    };

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
            toast('Operational settings synchronized successfully.', 'success');
        }
    });

    if (isLoading) return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />
            <div className="ml-64 p-12 max-w-4xl animate-in fade-in duration-500">
                <div className="mb-12">
                    <Skeleton className="h-10 w-64 mb-2" />
                    <Skeleton className="h-6 w-96" />
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
    );

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
                                    <Mail size={12} className="text-slate-500" /> {profile?.email}
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

                    {/* Ecosystem Synchronization - Enhanced with Calendar Selection & Sync Direction */}
                    <section className="bg-[#1E293B] border border-white/10 rounded-3xl p-10">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={14} /> Ecosystem Synchronization
                            </h2>
                            {connections && connections.length > 0 && (
                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-emerald-500/20 flex items-center gap-2">
                                    <CheckCircle2 size={10} /> {connections.length} Active Link{connections.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Google Calendar */}
                            <div className={`p-6 rounded-2xl bg-[#0F172A] border transition-all ${isConnected('google') ? 'border-indigo-500/30' : 'border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl">
                                            <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Google Calendar</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isConnected('google') ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {isConnected('google') ? 'Connected' : 'Disconnected'}
                                            </p>
                                        </div>
                                    </div>
                                    {!isConnected('google') ? (
                                        <button
                                            onClick={() => connectCalendar.mutate('google')}
                                            disabled={connectCalendar.isPending}
                                            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.95] disabled:opacity-50"
                                        >
                                            {connectCalendar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => triggerSync.mutate(getConnection('google')?.id || '')}
                                                disabled={triggerSync.isPending}
                                                className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
                                                title="Sync now"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => disconnectCalendar.mutate(getConnection('google')?.id || '')}
                                                disabled={disconnectCalendar.isPending}
                                                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Disconnect"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Connected - Show Settings */}
                                {isConnected('google') && getConnection('google') && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        {/* Calendar Selection */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Calendar</label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('google')?.calendar_name || 'No calendar selected'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => openCalendarSelector('google', getConnection('google')?.id || '')}
                                                className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                            >
                                                Change <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Sync Direction */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                                    <ArrowRightLeft className="w-3 h-3" /> Sync Direction
                                                </label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('google')?.sync_direction || 'both'}
                                                </p>
                                            </div>
                                            <select
                                                value={getConnection('google')?.sync_direction || 'both'}
                                                onChange={(e) => updateSyncDirection.mutate({ 
                                                    connectionId: getConnection('google')?.id || '', 
                                                    syncDirection: e.target.value as 'outbound' | 'inbound' | 'both'
                                                })}
                                                className="bg-[#1E293B] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="outbound">Outbound (CaseBridge → Calendar)</option>
                                                <option value="inbound">Inbound (Calendar → CaseBridge)</option>
                                                <option value="both">Both Ways</option>
                                            </select>
                                        </div>

                                        {/* Sync Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Auto-Sync</label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('google')?.sync_enabled ? 'Enabled' : 'Disabled'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggleSyncEnabled.mutate({
                                                    connectionId: getConnection('google')?.id || '',
                                                    syncEnabled: !getConnection('google')?.sync_enabled
                                                })}
                                                className={`w-12 h-6 rounded-full transition-all ${
                                                    getConnection('google')?.sync_enabled ? 'bg-indigo-600' : 'bg-slate-600'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                                    getConnection('google')?.sync_enabled ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Last Synced */}
                                        {getConnection('google')?.last_synced_at && (
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Last synced: {new Date(getConnection('google')?.last_synced_at || '').toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Outlook Calendar */}
                            <div className={`p-6 rounded-2xl bg-[#0F172A] border transition-all ${isConnected('outlook') || isConnected('azure') ? 'border-indigo-500/30' : 'border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/5 rounded-xl">
                                            <img src="https://www.microsoft.com/favicon.ico" className="w-6 h-6" alt="Outlook" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Outlook 365</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isConnected('outlook') || isConnected('azure') ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {isConnected('outlook') || isConnected('azure') ? 'Connected' : 'Disconnected'}
                                            </p>
                                        </div>
                                    </div>
                                    {!(isConnected('outlook') || isConnected('azure')) ? (
                                        <button
                                            onClick={() => connectCalendar.mutate('azure')}
                                            disabled={connectCalendar.isPending}
                                            className="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.95] disabled:opacity-50"
                                        >
                                            {connectCalendar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => triggerSync.mutate(getConnection('outlook')?.id || getConnection('azure')?.id || '')}
                                                disabled={triggerSync.isPending}
                                                className="p-2 text-slate-400 hover:text-indigo-400 transition-colors"
                                                title="Sync now"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button
                                                onClick={() => disconnectCalendar.mutate(getConnection('outlook')?.id || getConnection('azure')?.id || '')}
                                                disabled={disconnectCalendar.isPending}
                                                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                                                title="Disconnect"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Connected - Show Settings */}
                                {(isConnected('outlook') || isConnected('azure')) && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        {/* Calendar Selection */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Calendar</label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('outlook')?.calendar_name || getConnection('azure')?.calendar_name || 'No calendar selected'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => openCalendarSelector('outlook', getConnection('outlook')?.id || getConnection('azure')?.id || '')}
                                                className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                            >
                                                Change <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Sync Direction */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 flex items-center gap-1">
                                                    <ArrowRightLeft className="w-3 h-3" /> Sync Direction
                                                </label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('outlook')?.sync_direction || getConnection('azure')?.sync_direction || 'both'}
                                                </p>
                                            </div>
                                            <select
                                                value={getConnection('outlook')?.sync_direction || getConnection('azure')?.sync_direction || 'both'}
                                                onChange={(e) => updateSyncDirection.mutate({ 
                                                    connectionId: getConnection('outlook')?.id || getConnection('azure')?.id || '', 
                                                    syncDirection: e.target.value as 'outbound' | 'inbound' | 'both'
                                                })}
                                                className="bg-[#1E293B] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="outbound">Outbound (CaseBridge → Calendar)</option>
                                                <option value="inbound">Inbound (Calendar → CaseBridge)</option>
                                                <option value="both">Both Ways</option>
                                            </select>
                                        </div>

                                        {/* Sync Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Auto-Sync</label>
                                                <p className="text-xs text-slate-300">
                                                    {getConnection('outlook')?.sync_enabled ?? getConnection('azure')?.sync_enabled ? 'Enabled' : 'Disabled'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => toggleSyncEnabled.mutate({
                                                    connectionId: getConnection('outlook')?.id || getConnection('azure')?.id || '',
                                                    syncEnabled: !(getConnection('outlook')?.sync_enabled ?? getConnection('azure')?.sync_enabled)
                                                })}
                                                className={`w-12 h-6 rounded-full transition-all ${
                                                    getConnection('outlook')?.sync_enabled ?? getConnection('azure')?.sync_enabled ? 'bg-indigo-600' : 'bg-slate-600'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                                    getConnection('outlook')?.sync_enabled ?? getConnection('azure')?.sync_enabled ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                            </button>
                                        </div>

                                        {/* Last Synced */}
                                        {(getConnection('outlook')?.last_synced_at || getConnection('azure')?.last_synced_at) && (
                                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Last synced: {new Date(getConnection('outlook')?.last_synced_at || getConnection('azure')?.last_synced_at || '').toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 italic mt-6 flex items-center gap-2">
                            <Shield size={10} /> CaseBridge utilizes these connections to prevent double-booking and synchronize your firm deadlines.
                        </p>
                    </section>

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

            {/* Calendar Selector Modal */}
            <CalendarSelector
                isOpen={isCalendarSelectorOpen}
                onClose={() => setIsCalendarSelectorOpen(false)}
                provider={selectedProvider}
                connectionId={selectedConnectionId}
                onSelect={handleCalendarSelect}
            />
        </div>
    );
}
