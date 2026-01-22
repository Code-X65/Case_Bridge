import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

export interface Notification {
    id: string;
    recipient_user_id: string;
    recipient_role: string;
    event_type: string;
    event_category: 'case_lifecycle' | 'court_legal' | 'documentation' | 'team_activity' | 'system_compliance';
    firm_id: string;
    case_id: string | null;
    triggered_by: string | null;
    title: string;
    message: string;
    metadata: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    read_at: string | null;
    archived_at: string | null;
    created_at: string;
    triggered_by_name?: string;
    case_title?: string;
    matter_number?: string;
}

/**
 * Hook to fetch unread notifications for the current Case Manager
 */
export function useUnreadNotifications() {
    return useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('unread_notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Notification[];
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}

/**
 * Hook to fetch recent notifications (read and unread)
 */
export function useRecentNotifications(limit = 50) {
    return useQuery({
        queryKey: ['notifications', 'recent', limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('recent_notifications')
                .select('*')
                .limit(limit);

            if (error) throw error;
            return data as Notification[];
        },
    });
}

/**
 * Hook to get unread notification count
 */
export function useUnreadNotificationCount() {
    return useQuery({
        queryKey: ['notifications', 'count'],
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_unread_notification_count');

            if (error) throw error;
            return data as number;
        },
        refetchInterval: 15000, // Refetch every 15 seconds
    });
}

/**
 * Hook to mark a notification as read
 */
export function useMarkNotificationRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data, error } = await supabase
                .rpc('mark_notification_read', { p_notification_id: notificationId });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalidate all notification queries
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase
                .rpc('mark_all_notifications_read');

            if (error) throw error;
            return data as number;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

/**
 * Hook to archive a notification
 */
export function useArchiveNotification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data, error } = await supabase
                .rpc('archive_notification', { p_notification_id: notificationId });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

/**
 * Hook to subscribe to real-time notifications
 * Only works for Case Managers
 */
export function useNotificationSubscription() {
    const queryClient = useQueryClient();

    useEffect(() => {
        // Get current user
        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Subscribe to notifications for this user
            const channel = supabase
                .channel('notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `recipient_user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('New notification received:', payload);

                        // Invalidate queries to refetch
                        queryClient.invalidateQueries({ queryKey: ['notifications'] });

                        // Optionally show a toast or browser notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            const notification = payload.new as Notification;
                            new Notification(notification.title, {
                                body: notification.message,
                                icon: '/logo.png', // Update with your logo path
                                tag: notification.id,
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        };

        setupSubscription();
    }, [queryClient]);
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Helper to get priority color
 */
export function getPriorityColor(priority: Notification['priority']) {
    switch (priority) {
        case 'urgent':
            return 'text-red-600 bg-red-50 border-red-200';
        case 'high':
            return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'normal':
            return 'text-blue-600 bg-blue-50 border-blue-200';
        case 'low':
            return 'text-slate-600 bg-slate-50 border-slate-200';
        default:
            return 'text-slate-600 bg-slate-50 border-slate-200';
    }
}

/**
 * Helper to get category icon
 */
export function getCategoryIcon(category: Notification['event_category']) {
    switch (category) {
        case 'case_lifecycle':
            return '📋';
        case 'court_legal':
            return '⚖️';
        case 'documentation':
            return '📄';
        case 'team_activity':
            return '👥';
        case 'system_compliance':
            return '⚠️';
        default:
            return '🔔';
    }
}
