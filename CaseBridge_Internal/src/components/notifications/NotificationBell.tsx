import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from '@/hooks/useInternalSession';
import { Bell, Check, X, FileText, UserPlus, AlertCircle, TrendingUp } from 'lucide-react';

export default function NotificationBell() {
    const { session } = useInternalSession();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!session?.user_id) return;
        fetchNotifications();

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user_id}`
                },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user_id]);

    const fetchNotifications = async () => {
        if (!session?.user_id) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', session.user_id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session?.user_id)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'case_submitted': return <FileText className="w-4 h-4 text-blue-400" />;
            case 'status_change': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
            case 'assignment': return <UserPlus className="w-4 h-4 text-indigo-400" />;
            case 'lawyer_assigned': return <UserPlus className="w-4 h-4 text-emerald-400" />;
            case 'report_update': return <FileText className="w-4 h-4 text-purple-400" />;
            default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-12 w-96 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[500px] flex flex-col">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.is_read ? 'bg-indigo-500/5' : ''
                                            }`}
                                        onClick={() => markAsRead(notif.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">{getIcon(notif.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white mb-1">
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-slate-400 mb-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[10px] text-slate-600">
                                                    {new Date(notif.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
