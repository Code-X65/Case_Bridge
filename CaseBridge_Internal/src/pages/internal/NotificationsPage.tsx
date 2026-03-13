
import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationCategory } from '@/hooks/useNotifications';
import InternalSidebar from '@/components/layout/InternalSidebar';
import { Bell, Check, Clock, Trash2, ShieldAlert, CreditCard, UserPlus, Info } from 'lucide-react';

const CATEGORIES: { id: NotificationCategory; label: string; icon: any; color: string }[] = [
    { id: 'all', label: 'All Activity', icon: Bell, color: 'text-indigo-400' },
    { id: 'assignments', label: 'Assignments', icon: UserPlus, color: 'text-cyan-400' },
    { id: 'matter_updates', label: 'Case Updates', icon: ShieldAlert, color: 'text-emerald-400' },
    { id: 'billing', label: 'Billing', icon: CreditCard, color: 'text-amber-400' },
    { id: 'system', label: 'System', icon: Info, color: 'text-rose-400' },
];

export default function NotificationsPage() {
    const { 
        notifications, 
        isLoading, 
        unreadCount, 
        categoryFilter, 
        setCategoryFilter, 
        markAsRead, 
        markAllAsRead, 
        archiveNotification 
    } = useNotifications();

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen max-w-5xl">
                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-500/20 rounded-[1.5rem] flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/5 border border-indigo-500/20">
                            <Bell className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black mb-1 italic tracking-tighter uppercase">Intelligence <span className="text-indigo-400">Hub</span></h2>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Global firm activity & assignment stream</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.location.href = '/internal/notifications/settings'}
                            className="bg-white/5 hover:bg-white/10 text-slate-400 p-3 rounded-2xl transition-all border border-white/5"
                            title="Notification Governance"
                        >
                            <span className="sr-only">Settings</span>
                            <Info className="w-5 h-5" />
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsRead.mutate()}
                                className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/20 flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Clear Unread ({unreadCount})
                            </button>
                        )}
                    </div>
                </header>

                {/* Category Filters */}
                <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                categoryFilter === cat.id
                                    ? 'bg-white text-[#0F172A] border-white shadow-xl shadow-white/5'
                                    : 'bg-[#1E293B] text-slate-400 border-white/5 hover:border-white/20'
                            }`}
                        >
                            <cat.icon className={`w-4 h-4 ${categoryFilter === cat.id ? 'text-[#0F172A]' : cat.color}`} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    {isLoading && (
                        <div className="py-20 text-center animate-pulse">
                            <p className="text-slate-500 font-black uppercase tracking-[0.3em]">Syncing Feed...</p>
                        </div>
                    )}

                    {!isLoading && notifications?.length === 0 && (
                        <div className="text-center py-24 bg-[#1E293B]/30 border border-white/5 border-dashed rounded-[3rem]">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Bell className="w-10 h-10 text-slate-700" />
                            </div>
                            <h3 className="font-black text-slate-500 uppercase tracking-widest text-lg">No Recent Activity</h3>
                            <p className="text-slate-600 text-xs font-bold mt-2 uppercase tracking-tight">Current category filter returned zero records.</p>
                        </div>
                    )}

                    {notifications?.map((notification) => (
                        <div
                            key={notification.id}
                            className={`group relative p-10 rounded-[2.5rem] border transition-all ${notification.read_at
                                ? 'bg-[#1E293B]/40 border-white/5 opacity-60 hover:opacity-100'
                                : 'bg-[#1E293B] border-indigo-500/30 shadow-2xl shadow-indigo-500/5'
                                }`}
                        >
                            {!notification.read_at && (
                                <div className="absolute top-10 right-10 w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,1)]"></div>
                            )}

                            <div className="flex gap-8">
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center bg-indigo-500/10 text-indigo-400 flex-shrink-0 border border-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                                    <Bell className="w-7 h-7" />
                                </div>
                                <div className="flex-1">
                                    <header className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className={`text-2xl font-black tracking-tighter uppercase italic ${notification.read_at ? 'text-slate-500' : 'text-white'}`}>
                                                {notification.payload.title || 'Inbound Alert'}
                                            </h4>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20">
                                                    {notification.event_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-slate-700 font-bold">/</span>
                                                <span className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-2 tracking-widest">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(notification.created_at).toLocaleDateString()} @ {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </header>

                                    <p className={`text-base leading-relaxed mb-8 font-medium ${notification.read_at ? 'text-slate-600' : 'text-slate-400'}`}>
                                        {notification.payload.message}
                                    </p>

                                    <div className="flex items-center gap-6">
                                        {notification.payload.link && (
                                            <button
                                                onClick={() => (window.location.href = notification.payload.link!)}
                                                className="bg-white text-[#0F172A] px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-white/5 hover:scale-105"
                                            >
                                                Jump to Reference
                                            </button>
                                        )}
                                        {!notification.read_at && (
                                            <button
                                                onClick={() => markAsRead.mutate(notification.id)}
                                                className="text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                                Dismiss Alert
                                            </button>
                                        )}
                                        <button
                                            onClick={() => archiveNotification.mutate(notification.id)}
                                            className="text-[9px] font-black text-slate-700 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors ml-auto"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Archive
                                        </button>
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
