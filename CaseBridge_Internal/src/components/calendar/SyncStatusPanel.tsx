import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import {
    Calendar,
    RefreshCw,
    Check,
    X,
    AlertCircle,
    Clock,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { useToast } from '@/components/common/ToastService';

interface SyncStatus {
    id: string;
    provider: 'google' | 'outlook';
    provider_email: string;
    sync_enabled: boolean;
    last_sync_at: string | null;
    sync_direction: string;
    calendar_name: string | null;
}

interface SyncStatusPanelProps {
    connections?: SyncStatus[];
    onRefresh?: () => void;
}

export default function SyncStatusPanel({ connections, onRefresh }: SyncStatusPanelProps) {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch connections if not provided
    const { data: fetchedConnections, isLoading } = useQuery<SyncStatus[]>({
        queryKey: ['calendar_connections', session?.user_id],
        enabled: !connections && !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_calendar_connections')
                .select('*')
                .eq('user_id', session!.user_id);
            
            if (error) throw error;
            return data || [];
        }
    });

    const activeConnections = connections || fetchedConnections || [];

    const triggerSync = useMutation({
        mutationFn: async (provider: string) => {
            const { error } = await supabase.functions.invoke('calendar-sync', {
                body: { user_id: session?.user_id, provider }
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Sync triggered successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
            onRefresh?.();
        },
        onError: (error: any) => {
            toast(`Sync failed: ${error.message}`, 'error');
        }
    });

    const disconnectCalendar = useMutation({
        mutationFn: async (provider: string) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .delete()
                .eq('user_id', session!.user_id)
                .eq('provider', provider);
            
            if (error) throw error;
        },
        onSuccess: () => {
            toast('Calendar disconnected', 'success');
            queryClient.invalidateQueries({ queryKey: ['calendar_connections'] });
        },
        onError: (error: any) => {
            toast(`Disconnect failed: ${error.message}`, 'error');
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (activeConnections.length === 0) {
        return (
            <div className="text-center p-8 bg-white/5 rounded-xl border border-white/10">
                <Calendar className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-300 mb-2">No Calendars Connected</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Connect your Google or Outlook calendar to enable two-way sync
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activeConnections.map((conn) => (
                <div 
                    key={conn.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                conn.provider === 'google' 
                                    ? 'bg-red-500/10' 
                                    : 'bg-blue-500/10'
                            }`}>
                                <Calendar className={`w-6 h-6 ${
                                    conn.provider === 'google' 
                                        ? 'text-red-400' 
                                        : 'text-blue-400'
                                }`} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white capitalize">
                                    {conn.provider} Calendar
                                </h4>
                                <p className="text-xs text-slate-500">
                                    {conn.provider_email}
                                </p>
                                {conn.calendar_name && (
                                    <p className="text-xs text-indigo-400 mt-1">
                                        <ExternalLink className="w-3 h-3 inline mr-1" />
                                        {conn.calendar_name}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {conn.sync_enabled ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                                    <Check className="w-3 h-3" />
                                    Active
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-500/10 px-2 py-1 rounded-full">
                                    <X className="w-3 h-3" />
                                    Disabled
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Sync Status */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span>
                                    {conn.last_sync_at 
                                        ? `Last synced: ${new Date(conn.last_sync_at).toLocaleString()}`
                                        : 'Never synced'
                                    }
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => triggerSync.mutate(conn.provider)}
                                    disabled={triggerSync.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                                >
                                    {triggerSync.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3 h-3" />
                                    )}
                                    Sync Now
                                </button>
                                
                                <button
                                    onClick={() => {
                                        if (confirm(`Disconnect ${conn.provider} calendar?`)) {
                                            disconnectCalendar.mutate(conn.provider);
                                        }
                                    }}
                                    disabled={disconnectCalendar.isPending}
                                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error State */}
                    {conn.sync_direction === 'error' && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span className="text-xs text-red-400">
                                Sync error. Please reconnect your calendar.
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
