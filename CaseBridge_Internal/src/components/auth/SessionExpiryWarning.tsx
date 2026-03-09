import { useState, useEffect } from 'react';
import { useInternalSession } from '@/hooks/useInternalSession';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, RefreshCcw, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SessionExpiryWarning() {
    const navigate = useNavigate();
    const { session, refreshSession, clearSession } = useInternalSession();
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // Seconds
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!session?.expires_at) {
            setIsVisible(false);
            return;
        }

        const interval = setInterval(() => {
            const expiry = new Date(session.expires_at).getTime();
            const now = new Date().getTime();
            const seconds = Math.floor((expiry - now) / 1000);

            setTimeLeft(seconds);

            // Show warning if less than 5 minutes (300 seconds)
            if (seconds > 0 && seconds <= 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }

            // Force logout if expired
            if (seconds <= 0) {
                clearSession.mutate();
                navigate('/internal/login');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session, clearSession, navigate]);

    if (!isVisible || !timeLeft) return null;

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isCritical = timeLeft <= 60;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-lg px-4"
            >
                <div className={`backdrop-blur-2xl border p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-6 ${isCritical
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-amber-500/20 border-amber-500/30'
                    }`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                            }`}>
                            {isCritical ? <AlertTriangle className="text-white w-6 h-6" /> : <Clock className="text-white w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Session Expiring</h3>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                                Secure Token expires in <span className="text-white font-black">{formatTime(timeLeft)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => refreshSession.mutate()}
                            disabled={refreshSession.isPending}
                            className="h-11 px-6 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {refreshSession.isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <RefreshCcw size={14} />
                            )}
                            Extend
                        </button>
                        <button
                            onClick={() => {
                                clearSession.mutate();
                                navigate('/internal/login');
                            }}
                            className="h-11 w-11 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all shadow-lg active:scale-95"
                            title="Logout Now"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
