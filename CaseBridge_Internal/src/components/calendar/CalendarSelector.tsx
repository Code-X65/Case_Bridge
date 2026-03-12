import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { 
    Calendar, 
    X, 
    Check, 
    Loader2, 
    RefreshCw, 
    AlertCircle,
    ChevronRight,
    Clock
} from 'lucide-react';
import { useToast } from '@/components/common/ToastService';

interface CalendarInfo {
    id: string;
    summary: string;
    description?: string;
    primary?: boolean;
    timeZone?: string;
}

interface CalendarSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    provider: 'google' | 'outlook';
    connectionId: string;
    onSelect: (calendarId: string, calendarName: string) => void;
}

export default function CalendarSelector({ 
    isOpen, 
    onClose, 
    provider, 
    connectionId,
    onSelect 
}: CalendarSelectorProps) {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
    const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

    // Fetch available calendars from the provider
    const fetchCalendars = useMutation({
        mutationFn: async () => {
            setIsLoadingCalendars(true);
            // Call the edge function to fetch calendars
            const { data, error } = await supabase.functions.invoke('calendar-get-calendars', {
                body: {
                    user_id: session?.user_id,
                    provider,
                    connection_id: connectionId
                }
            });
            
            if (error) throw error;
            return data as CalendarInfo[];
        },
        onSuccess: () => {
            setIsLoadingCalendars(false);
        },
        onError: (error: any) => {
            setIsLoadingCalendars(false);
            toast(`Failed to fetch calendars: ${error.message}`, 'error');
        }
    });

    // Auto-fetch calendars when modal opens
    useEffect(() => {
        if (isOpen && provider && connectionId) {
            fetchCalendars.mutate();
        }
    }, [isOpen, provider, connectionId]);

    // Handle calendar selection
    const handleSelect = () => {
        if (!selectedCalendar) return;
        
        const calendar = fetchCalendars.data?.find(c => c.id === selectedCalendar);
        if (calendar) {
            onSelect(selectedCalendar, calendar.summary);
            onClose();
        }
    };

    // Save calendar selection to database
    const saveCalendarSelection = useMutation({
        mutationFn: async ({ calendarId, calendarName }: { calendarId: string; calendarName: string }) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .update({
                    calendar_id: calendarId,
                    calendar_name: calendarName,
                    updated_at: new Date().toISOString()
                })
                .eq('id', connectionId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast('Calendar selection saved', 'success');
        },
        onError: (error: any) => {
            toast(`Failed to save: ${error.message}`, 'error');
        }
    });

    const handleSaveAndClose = async () => {
        if (!selectedCalendar) return;
        
        const calendar = fetchCalendars.data?.find(c => c.id === selectedCalendar);
        if (calendar) {
            await saveCalendarSelection.mutateAsync({ 
                calendarId: calendar.id, 
                calendarName: calendar.summary 
            });
            onSelect(calendar.id, calendar.summary);
            onClose();
        }
    };

    if (!isOpen) return null;

    const providerName = provider === 'google' ? 'Google Calendar' : 'Outlook Calendar';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-[#1E293B] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                            provider === 'google' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}>
                            <Calendar className={`w-5 h-5 ${
                                provider === 'google' ? 'text-red-400' : 'text-blue-400'
                            }`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Select Calendar</h3>
                            <p className="text-xs text-slate-400">{providerName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {fetchCalendars.isPending || isLoadingCalendars ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                            <p className="text-sm text-slate-400">Loading calendars...</p>
                        </div>
                    ) : fetchCalendars.isError ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
                            <p className="text-sm text-slate-400 mb-4">Failed to load calendars</p>
                            <button
                                onClick={() => fetchCalendars.mutate()}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Retry
                            </button>
                        </div>
                    ) : fetchCalendars.data && fetchCalendars.data.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {fetchCalendars.data.map((calendar) => (
                                <button
                                    key={calendar.id}
                                    onClick={() => setSelectedCalendar(calendar.id)}
                                    className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
                                        selectedCalendar === calendar.id
                                            ? 'bg-indigo-500/10 border-indigo-500/30'
                                            : 'bg-[#0F172A] border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            selectedCalendar === calendar.id
                                                ? 'border-indigo-500 bg-indigo-500'
                                                : 'border-slate-600'
                                        }`}>
                                            {selectedCalendar === calendar.id && (
                                                <Check className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-white">
                                                {calendar.summary}
                                                {calendar.primary && (
                                                    <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                                                        Primary
                                                    </span>
                                                )}
                                            </p>
                                            {calendar.description && (
                                                <p className="text-xs text-slate-500 line-clamp-1">
                                                    {calendar.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Calendar className="w-8 h-8 text-slate-600 mb-4" />
                            <p className="text-sm text-slate-400">No calendars found</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveAndClose}
                        disabled={!selectedCalendar || saveCalendarSelection.isPending}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-colors"
                    >
                        {saveCalendarSelection.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Select Calendar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
