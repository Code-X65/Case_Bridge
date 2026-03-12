import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from './useInternalSession';

export interface CalendarConnection {
    id: string;
    provider: 'google' | 'outlook';
    provider_email: string;
    calendar_id?: string;
    calendar_name?: string;
    sync_direction?: 'outbound' | 'inbound' | 'both';
    sync_enabled: boolean;
    last_synced_at?: string;
    created_at: string;
    updated_at: string;
}

interface ConnectCalendarParams {
    provider: 'google' | 'outlook';
    calendarId?: string;
    syncDirection?: 'outbound' | 'inbound' | 'both';
}

export function useCalendarConnection() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();

    // Fetch all calendar connections for the current user
    const getConnections = useQuery<CalendarConnection[]>({
        queryKey: ['calendar_connections', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_calendar_connections')
                .select('*')
                .eq('user_id', session!.user_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
    });

    // Connect a new calendar provider via OAuth
    const connectCalendar = useMutation({
        mutationFn: async ({ provider }: { provider: 'google' | 'outlook' }) => {
            // Use Supabase's linkIdentity for OAuth flow
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
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Disconnect a calendar connection
    const disconnectCalendar = useMutation({
        mutationFn: async (connectionId: string) => {
            const { error } = await supabase
                .from('user_calendar_connections')
                .delete()
                .eq('id', connectionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Update calendar settings (calendar_id, sync_direction, sync_enabled)
    const updateCalendarSettings = useMutation({
        mutationFn: async ({
            connectionId,
            calendarId,
            calendarName,
            syncDirection,
            syncEnabled,
        }: {
            connectionId: string;
            calendarId?: string;
            calendarName?: string;
            syncDirection?: 'outbound' | 'inbound' | 'both';
            syncEnabled?: boolean;
        }) => {
            const updates: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (calendarId !== undefined) updates.calendar_id = calendarId;
            if (calendarName !== undefined) updates.calendar_name = calendarName;
            if (syncDirection !== undefined) updates.sync_direction = syncDirection;
            if (syncEnabled !== undefined) updates.sync_enabled = syncEnabled;

            const { error } = await supabase
                .from('user_calendar_connections')
                .update(updates)
                .eq('id', connectionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Trigger a manual sync for a specific connection
    const triggerSync = useMutation({
        mutationFn: async (connectionId: string) => {
            const connection = getConnections.data?.find(c => c.id === connectionId);
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
            queryClient.invalidateQueries({ queryKey: ['calendar_connections', session?.user_id] });
        },
    });

    // Get sync status for a specific connection
    const getSyncStatus = useQuery({
        queryKey: ['calendar_sync_status', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('calendar_sync_logs')
                .select('*')
                .eq('user_id', session!.user_id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data || [];
        },
    });

    // Check if a specific provider is connected
    const isProviderConnected = (provider: 'google' | 'outlook'): boolean => {
        return getConnections.data?.some(c => c.provider === provider) || false;
    };

    // Get connection for a specific provider
    const getConnectionByProvider = (provider: 'google' | 'outlook'): CalendarConnection | undefined => {
        return getConnections.data?.find(c => c.provider === provider);
    };

    return {
        // Data
        connections: getConnections.data || [],
        isLoading: getConnections.isLoading,
        error: getConnections.error,
        
        // Queries
        getConnections,
        getSyncStatus,
        isProviderConnected,
        getConnectionByProvider,
        
        // Mutations
        connectCalendar,
        disconnectCalendar,
        updateCalendarSettings,
        triggerSync,
    };
}
