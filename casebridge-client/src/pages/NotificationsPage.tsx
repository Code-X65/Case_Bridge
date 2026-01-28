import { useNotifications } from '../hooks/useNotifications';
import ClientLayout from '../components/ClientLayout';
import { Bell, Check, Clock, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function NotificationsPage() {
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    useGSAP(() => {
        if (!isLoading) {
            gsap.from('.notification-card', {
                opacity: 0,
                y: 20,
                duration: 0.5,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    }, [isLoading]);

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                            <Bell size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Notifications</h1>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Updates on your legal matters</p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead.mutate()}
                            className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/10"
                        >
                            <Check size={16} />
                            Mark all as read
                        </button>
                    )}
                </header>

                <div className="space-y-4">
                    {isLoading && (
                        <div className="flex justify-center py-20">
                            <span className="animate-spin h-8 w-8 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                        </div>
                    )}

                    {!isLoading && notifications?.length === 0 && (
                        <div className="text-center py-24 glass-card border-dashed">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                                <Bell size={40} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-black text-slate-400 mb-2">You're All Caught Up</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">New updates about your cases or assigned counsel will appear here.</p>
                        </div>
                    )}

                    {notifications?.map((notification) => (
                        <div
                            key={notification.id}
                            className={`notification-card relative p-8 rounded-[2rem] border transition-all ${notification.read_at
                                ? 'bg-white/5 border-white/5 opacity-75 hover:opacity-100'
                                : 'bg-white/10 border-blue-500/20 shadow-2xl shadow-blue-500/5'
                                }`}
                        >
                            {!notification.read_at && (
                                <div className="absolute top-8 right-8 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-500/10 text-blue-400 flex-shrink-0 border border-blue-500/10`}>
                                    <Shield size={24} />
                                </div>
                                <div className="flex-1">
                                    <header className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className={`text-xl font-black tracking-tight ${notification.read_at ? 'text-slate-400' : 'text-white'}`}>
                                                {notification.payload.title || 'Case Update'}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                                    {notification.event_type.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-slate-600 font-bold">•</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                                                    <Clock size={12} />
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </header>

                                    <p className="text-slate-300 text-sm leading-relaxed mb-6 italic opacity-80">
                                        "{notification.payload.message}"
                                    </p>

                                    <div className="flex items-center gap-4">
                                        {notification.payload.link && (
                                            <Link
                                                to={notification.payload.link}
                                                onClick={() => !notification.read_at && markAsRead.mutate(notification.id)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 group"
                                            >
                                                View Case
                                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}
                                        {!notification.read_at && (
                                            <button
                                                onClick={() => markAsRead.mutate(notification.id)}
                                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                                            >
                                                <Check size={14} />
                                                Dismiss
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ClientLayout>
    );
}
