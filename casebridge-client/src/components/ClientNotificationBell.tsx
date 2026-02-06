import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Bell, FileText, TrendingUp, UserPlus, Check } from 'lucide-react';

export default function ClientNotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        fetchNotifications();

        // Subscribe to real-time notifications
        const channel = supabase
            .channel('client_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
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
    }, [user?.id]);

    const fetchNotifications = async () => {
        if (!user?.id) return;

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(15);

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

    const getIcon = (type: string) => {
        switch (type) {
            case 'status_change': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
            case 'lawyer_assigned': return <UserPlus className="w-4 h-4 text-emerald-400" />;
            case 'report_update': return <FileText className="w-4 h-4 text-purple-400" />;
            case 'case_submitted': return <Check className="w-4 h-4 text-green-400" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
                    <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[450px] flex flex-col">
                        <div className="p-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-900">Notifications</h3>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => markAsRead(notif.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">{getIcon(notif.type)}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900 mb-1">
                                                    {notif.title}
                                                </p>
                                                <p className="text-xs text-slate-600 mb-2">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {new Date(notif.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
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
