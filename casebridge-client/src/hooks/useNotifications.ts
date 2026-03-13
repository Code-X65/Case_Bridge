
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnectivity } from '../contexts/ConnectivityContext';

export type NotificationCategory = 'matter_updates' | 'billing' | 'assignments' | 'system' | 'all';

export interface Notification {
    id: string;
    event_type: string;
    channel: 'email' | 'in_app' | 'push';
    category?: NotificationCategory;
    payload: {
        title: string;
        message: string;
        link?: string;
        category?: NotificationCategory;
    };
    sent_at: string;
    read_at: string | null;
    created_at: string;
    archived_at: string | null;
}

export function useNotifications(initialCategory: NotificationCategory = 'all') {
    const { user } = useAuth();
    const { setRealtimeStatus } = useConnectivity();
    const queryClient = useQueryClient();
    const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>(initialCategory);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user!.id)
                .is('archived_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("useNotifications Fetch Error:", error);
                return [];
            }
            return (data || []) as Notification[];
        },
        staleTime: 1000 * 60 * 30, 
    });

    const filteredNotifications = notifications?.filter(n => {
        if (categoryFilter === 'all') return true;
        return n.payload.category === categoryFilter || n.category === categoryFilter;
    });

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`client-notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
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
    }, [user?.id, queryClient, setRealtimeStatus]);

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

    const archiveNotification = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const unreadCount = notifications?.filter(n => !n.read_at).length || 0;

    return {
        notifications: filteredNotifications,
        allNotifications: notifications,
        isLoading,
        unreadCount,
        categoryFilter,
        setCategoryFilter,
        markAsRead,
        markAllAsRead,
        archiveNotification
    };
}
