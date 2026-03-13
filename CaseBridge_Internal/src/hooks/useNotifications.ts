
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from './useInternalSession';
import { useToast } from '@/components/common/ToastService';

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
    const { session } = useInternalSession();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>(initialCategory);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session!.user_id)
                .is('archived_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Notification[];
        },
        staleTime: 1000 * 60 * 5, 
    });

    const filteredNotifications = notifications?.filter(n => {
        if (categoryFilter === 'all') return true;
        return n.payload.category === categoryFilter || n.category === categoryFilter;
    });

    useEffect(() => {
        if (!session?.user_id) return;

        const channel = supabase
            .channel(`internal-notifications-${session.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user_id}`
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newNotif = payload.new as Notification;
                        toast(newNotif.payload.title || 'Institutional Alert', 'info');
                    }
                    queryClient.invalidateQueries({ queryKey: ['notifications', session.user_id] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user_id, queryClient, toast]);

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
