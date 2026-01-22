import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    Bell,
    Check,
    Clock,
    ArrowRight,
    Mail,
    Briefcase,
    Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast({
                title: 'All read',
                description: 'All notifications marked as read',
            });
        },
    });

    const handleNotificationClick = (notification: any) => {
        if (!notification.read) {
            markAsReadMutation.mutate(notification.id);
        }

        if (notification.payload?.matter_id) {
            navigate(`/cases/${notification.payload.matter_id}`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'case_update': return <Briefcase className="h-5 w-5 text-blue-600" />;
            case 'new_assignment': return <Clock className="h-5 w-5 text-indigo-600" />;
            case 'message': return <Mail className="h-5 w-5 text-slate-600" />;
            default: return <Info className="h-5 w-5 text-slate-500" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 uppercase tracking-tight">
                        Notifications
                    </h1>
                    <p className="text-sm text-slate-600 font-medium mt-1">
                        Updates and alerts from your firm activity
                    </p>
                </div>
                <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending || notifications?.filter(n => !n.read).length === 0}
                    className="h-10 px-4 bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    <Check className="h-4 w-4" />
                    Mark all as read
                </button>
            </div>

            <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-500">Loading notifications...</div>
                    ) : notifications?.length === 0 ? (
                        <div className="p-12 text-center">
                            <Bell className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
                            <p className="text-sm text-slate-500">You have no new notifications.</p>
                        </div>
                    ) : (
                        notifications?.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`p-6 flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50 border-l-4 border-primary' : ''}`}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center ${!notification.read ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className={`text-sm font-semibold text-slate-900 ${!notification.read ? 'text-primary' : ''}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                                            {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3">
                                        {!notification.read && (
                                            <span className="w-2 h-2 bg-primary rounded-full" />
                                        )}
                                        {notification.payload?.matter_id && (
                                            <span className="text-[10px] font-semibold uppercase text-primary flex items-center gap-1 group">
                                                View Case
                                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
