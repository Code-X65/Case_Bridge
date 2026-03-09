
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from './useInternalSession';

export interface Notification {
    id: string;
    event_type: string;
    channel: 'email' | 'in_app';
    payload: {
        title: string;
        message: string;
        link?: string;
    };
    sent_at: string;
    read_at: string | null;
    created_at: string;
}

export function useNotifications() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session!.user_id)
                .eq('channel', 'in_app') // Only fetch in-app for the UI
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Notification[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes - relying on realtime
    });

    // Real-time subscription to notifications
    useEffect(() => {
        if (!session?.user_id) return;

        const channel = supabase
            .channel(`internal-notifications-${session.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user_id}`
                },
                (payload) => {
                    // Update the cache immediately with the new notification
                    queryClient.setQueryData(['notifications', session.user_id], (old: Notification[] | undefined) => {
                        const newNotif = payload.new as Notification;
                        if (!old) return [newNotif];
                        // Avoid duplicates if any
                        if (old.find(n => n.id === newNotif.id)) return old;
                        return [newNotif, ...old];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user_id}`
                },
                (payload) => {
                    // Update existing notification (e.g. mark as read)
                    queryClient.setQueryData(['notifications', session.user_id], (old: Notification[] | undefined) => {
                        if (!old) return [];
                        return old.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user_id, queryClient]);

    const markAsRead = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('user_id', session!.user_id)
                .is('read_at', null);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const unreadCount = notifications?.filter(n => !n.read_at).length || 0;

    return {
        notifications,
        isLoading,
        unreadCount,
        markAsRead,
        markAllAsRead
    };
}
