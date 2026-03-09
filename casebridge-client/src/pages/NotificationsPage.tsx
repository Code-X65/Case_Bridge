import { useNotifications } from '../hooks/useNotifications';
import { Bell, Check, Clock, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotificationsPage() {
    const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    return (
        <div className="animate-fade-in relative max-w-4xl mx-auto pb-10">
            {/* Ambient Background Blur */}
            <div className="absolute top-[0%] right-[10%] w-[30%] h-[30%] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

            <div className="relative z-10 px-2 sm:px-0">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                            <Bell size={28} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-1">Alerts</h1>
                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Updates on your legal matters</p>
                        </div>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={() => markAllAsRead.mutate()}
                            className="w-full sm:w-auto bg-card hover:bg-input text-foreground px-6 py-3.5 sm:py-3 rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-border shadow-sm hover:shadow-neumorph-inset"
                        >
                            <Check size={16} />
                            Mark all as read
                        </button>
                    )}
                </header>

                <div className="space-y-4">
                    {isLoading && (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={40} />
                        </div>
                    )}

                    {!isLoading && (!notifications || notifications.length === 0) && (
                        <div className="bg-card/50 border border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center py-16 sm:py-24 shadow-neumorph-inset">
                            <div className="w-20 h-20 bg-input border border-border rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Bell size={36} className="text-muted-foreground/50" />
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">You're All Caught Up</h3>
                            <p className="text-muted-foreground text-sm sm:text-base max-w-sm text-center px-4">New updates about your cases or assigned counsel will appear here.</p>
                        </div>
                    )}

                    {notifications?.map((notification) => (
                        <div
                            key={notification.id}
                            className={`relative p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border transition-all duration-300 ${notification.read_at
                                ? 'bg-card border-border shadow-sm hover:shadow-neumorph opacity-80 hover:opacity-100'
                                : 'bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(201,162,77,0.1)]'
                                }`}
                        >
                            {/* Hover background glow */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-[1.5rem] sm:rounded-[2rem] pointer-events-none"></div>

                            {!notification.read_at && (
                                <div className="absolute top-6 right-6 sm:top-8 sm:right-8 w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(201,162,77,0.8)] animate-pulse"></div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 relative z-10">
                                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${notification.read_at ? 'bg-input border-border text-muted-foreground' : 'bg-primary/20 border-primary/30 text-primary'}`}>
                                    <Shield size={22} className="sm:w-6 sm:h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <header className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className={`text-lg sm:text-xl font-bold tracking-tight leading-tight ${notification.read_at ? 'text-foreground' : 'text-primary'}`}>
                                                {notification.payload?.title || 'Case Update'}
                                            </h4>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                                    {(notification.event_type || 'update').replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-border hidden sm:inline">•</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 whitespace-nowrap">
                                                    <Clock size={12} />
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </header>

                                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6 border-l-2 border-primary/30 pl-4 py-1 italic break-words">
                                        "{notification.payload?.message || 'No details provided.'}"
                                    </p>

                                    <div className="flex flex-col sm:flex-row items-center gap-4">
                                        {notification.payload?.link && (
                                            <Link
                                                to={notification.payload.link}
                                                onClick={() => !notification.read_at && markAsRead.mutate(notification.id)}
                                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 sm:py-3 rounded-[var(--radius-neumorph)] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(201,162,77,0.3)] hover:shadow-[0_0_20px_rgba(201,162,77,0.4)] flex items-center justify-center gap-2 group hover:-translate-y-0.5 active:scale-95"
                                            >
                                                View Case
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        )}
                                        {!notification.read_at && (
                                            <button
                                                onClick={() => markAsRead.mutate(notification.id)}
                                                className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--radius-neumorph)] hover:bg-input border border-transparent hover:border-border"
                                            >
                                                <Check size={16} />
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
        </div>
    );
}
