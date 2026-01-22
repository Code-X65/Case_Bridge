import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Bell, CheckCircle2, FileText, UserCheck, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    payload: any;
    read: boolean;
    created_at: string;
}

export default function NotificationsList() {
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['client-notifications'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return data as Notification[];
        },
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (notificationId: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
            toast({
                title: 'All Notifications Marked as Read',
                description: 'Your notifications have been updated.',
            });
        },
    });

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'case_status_changed':
                return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
            case 'court_report_submitted':
                return <FileText className="h-5 w-5 text-green-600" />;
            case 'lawyer_assigned':
                return <UserCheck className="h-5 w-5 text-purple-600" />;
            case 'case_closed':
                return <XCircle className="h-5 w-5 text-slate-600" />;
            default:
                return <Bell className="h-5 w-5 text-slate-600" />;
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const unreadCount = notifications?.filter(n => !n.read).length || 0;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Notifications
                    </h2>
                    {unreadCount > 0 && (
                        <p className="text-sm text-slate-600 font-medium mt-1">
                            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                        className="text-xs font-bold text-primary hover:underline"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {!notifications || notifications.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">
                        No Notifications
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                        You're all caught up! Notifications will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map((notification) => {
                        const matterId = notification.payload?.matter_id;
                        const notificationContent = (
                            <div
                                onClick={() => handleNotificationClick(notification)}
                                className={`bg-white rounded-xl border transition-all cursor-pointer ${notification.read
                                        ? 'border-slate-200 hover:border-slate-300'
                                        : 'border-primary/30 bg-primary/5 hover:border-primary/50'
                                    }`}
                            >
                                <div className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notification.read ? 'bg-slate-100' : 'bg-white border-2 border-primary/20'
                                            }`}>
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-black text-slate-900">
                                                    {notification.title}
                                                </h3>
                                                {!notification.read && (
                                                    <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium mb-2">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="font-medium">
                                                    {format(new Date(notification.created_at), 'MMM dd, yyyy • h:mm a')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );

                        // If notification has a matter_id, wrap in Link
                        if (matterId) {
                            return (
                                <Link key={notification.id} to={`/client/matters/${matterId}`}>
                                    {notificationContent}
                                </Link>
                            );
                        }

                        return <div key={notification.id}>{notificationContent}</div>;
                    })}
                </div>
            )}
        </div>
    );
}
