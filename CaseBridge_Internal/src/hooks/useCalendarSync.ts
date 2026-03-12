import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from './useInternalSession';

export interface SyncLog {
    id: string;
    user_id: string;
    provider: 'google' | 'outlook';
    connection_id: string;
    sync_type: 'full' | 'incremental' | 'manual';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    events_synced: number;
    errors: string | null;
    started_at: string;
    completed_at: string | null;
    created_at: string;
}

export interface SyncStatus {
    isSyncing: boolean;
    lastSyncAt: string | null;
    syncProgress: number;
    lastError: string | null;
}

export function useCalendarSync() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();

    // Get current sync status - polls for active sync
    const getSyncStatus = useQuery<SyncLog[]>({
        queryKey: ['calendar_sync_status', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_sync_logs')
                .select('*')
                .eq('user_id', session!.user_id)
                .in('status', ['pending', 'in_progress'])
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;
            return data || [];
        },
        refetchInterval: 5000, // Poll every 5 seconds when syncing
    });

    // Get recent sync history
    const getSyncHistory = useQuery<SyncLog[]>({
        queryKey: ['calendar_sync_history', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_sync_logs')
                .select('*')
                .eq('user_id', session!.user_id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data || [];
        },
    });

    // Trigger manual sync for all connected calendars
    const syncNow = useMutation({
        mutationFn: async (provider?: 'google' | 'outlook') => {
            // Get all connections if no specific provider
            let connections;
            if (provider) {
                const { data } = await supabase
                    .from('user_calendar_connections')
                    .select('id, provider')
                    .eq('user_id', session!.user_id)
                    .eq('provider', provider)
                    .eq('sync_enabled', true);
                connections = data || [];
            } else {
                const { data } = await supabase
                    .from('user_calendar_connections')
                    .select('id, provider')
                    .eq('user_id', session!.user_id)
                    .eq('sync_enabled', true);
                connections = data || [];
            }

            // Trigger sync for each connection
            const syncPromises = connections.map(async (conn) => {
                const { error } = await supabase.functions.invoke('calendar-sync', {
                    body: { 
                        user_id: session?.user_id, 
                        provider: conn.provider,
                        connection_id: conn.id,
                        sync_type: 'manual'
                    }
                });
                if (error) throw error;
            });

            await Promise.all(syncPromises);
        },
        onSuccess: () => {
            // Invalidate queries to refetch status
            queryClient.invalidateQueries({ queryKey: ['calendar_sync_status', session?.user_id] });
            queryClient.invalidateQueries({ queryKey: ['calendar_sync_history', session?.user_id] });
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Trigger sync for a specific connection
    const syncConnection = useMutation({
        mutationFn: async (connectionId: string) => {
            // First get the connection details
            const { data: connection, error: connError } = await supabase
                .from('user_calendar_connections')
                .select('id, provider')
                .eq('id', connectionId)
                .single();

            if (connError) throw connError;
            if (!connection) throw new Error('Connection not found');

            const { error } = await supabase.functions.invoke('calendar-sync', {
                body: { 
                    user_id: session?.user_id, 
                    provider: connection.provider,
                    connection_id: connection.id,
                    sync_type: 'manual'
                }
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar_sync_status', session?.user_id] });
            queryClient.invalidateQueries({ queryKey: ['calendar_sync_history', session?.user_id] });
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Check if any sync is currently in progress
    const isSyncing = getSyncStatus.data && getSyncStatus.data.length > 0;

    // Get the most recent completed sync
    const getLastCompletedSync = useQuery<SyncLog | null>({
        queryKey: ['calendar_last_sync', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_sync_logs')
                .select('*')
                .eq('user_id', session!.user_id)
                .eq('status', 'completed')
                .order('completed_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
    });

    // Subscribe to real-time sync status updates
    const subscribeToSyncStatus = (callback: (payload: SyncLog) => void) => {
        const channel = supabase
            .channel('calendar_sync_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'calendar_sync_logs',
                    filter: `user_id=eq.${session?.user_id}`,
                },
                (payload) => {
                    callback(payload.new as SyncLog);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    return {
        // Data
        syncStatus: getSyncStatus.data || [],
        syncHistory: getSyncHistory.data || [],
        lastCompletedSync: getLastCompletedSync.data,
        
        // Loading states
        isSyncing,
        isLoadingSyncStatus: getSyncStatus.isLoading,
        isLoadingHistory: getSyncHistory.isLoading,
        
        // Queries
        getSyncStatus,
        getSyncHistory,
        getLastCompletedSync,
        
        // Mutations
        syncNow,
        syncConnection,
        
        // Real-time
        subscribeToSyncStatus,
    };
}
