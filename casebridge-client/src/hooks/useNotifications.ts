
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnectivity } from '../contexts/ConnectivityContext';

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
    const { user } = useAuth();
    const { setRealtimeStatus } = useConnectivity();
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("useNotifications Fetch Error:", error);
                return [];
            }
            return (data || []) as Notification[];
        },
        staleTime: 1000 * 60 * 30, // 30 minutes - relying on realtime
    });

    // Real-time subscription to notifications
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`client-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    queryClient.setQueryData(['notifications', user.id], (old: Notification[] | undefined) => {
                        const newNotif = payload.new as Notification;
                        if (!old) return [newNotif];
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
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    queryClient.setQueryData(['notifications', user.id], (old: Notification[] | undefined) => {
                        if (!old) return [];
                        return old.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n);
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setRealtimeStatus(true);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setRealtimeStatus(false, err?.message || 'Connection lost');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient]);

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
                .eq('user_id', user!.id)
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
