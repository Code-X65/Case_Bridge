
import { useNotifications } from '@/hooks/useNotifications';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { Bell, Check, Clock, Info } from 'lucide-react';

export default function NotificationsPage() {
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-4xl">
                <header className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black mb-1">Notifications</h2>
                            <p className="text-slate-400">Stay updated on case activities and assignments.</p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead.mutate()}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border border-white/10"
                        >
                            <Check className="w-4 h-4" />
                            Mark all as read
                        </button>
                    )}
                </header>

                <div className="space-y-4">
                    {isLoading && (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Loading notifications...</p>
                        </div>
                    )}

                    {!isLoading && notifications?.length === 0 && (
                        <div className="text-center py-20 bg-[#1E293B] border border-white/5 rounded-3xl">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="font-bold text-slate-400 mb-1">All caught up!</h3>
                            <p className="text-slate-500 text-sm">You have no new notifications.</p>
                        </div>
                    )}

                    {notifications?.map((notification) => (
                        <div
                            key={notification.id}
                            className={`relative p-8 rounded-[2rem] border transition-all ${notification.read_at
                                ? 'bg-[#1E293B]/50 border-white/5 opacity-75 hover:opacity-100'
                                : 'bg-[#1E293B] border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                                }`}
                        >
                            {!notification.read_at && (
                                <div className="absolute top-8 right-8 w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)]"></div>
                            )}

                            <div className="flex gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-500/10 text-indigo-400 flex-shrink-0 border border-indigo-500/10`}>
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <header className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className={`text-lg font-black tracking-tight ${notification.read_at ? 'text-slate-400' : 'text-white'}`}>
                                                {notification.payload.title || 'New Notification'}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                                                    {notification.event_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-slate-600 font-bold">•</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </header>

                                    <p className="text-slate-400 text-base leading-relaxed mb-6 italic">
                                        "{notification.payload.message}"
                                    </p>

                                    <div className="flex items-center gap-4">
                                        {notification.payload.link && (
                                            <button
                                                onClick={() => (window.location.href = notification.payload.link!)}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase italic tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                Take Action
                                            </button>
                                        )}
                                        {!notification.read_at && (
                                            <button
                                                onClick={() => markAsRead.mutate(notification.id)}
                                                className="text-xs font-bold text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                                            >
                                                <Check className="w-4 h-4" />
                                                Mark as handled
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
