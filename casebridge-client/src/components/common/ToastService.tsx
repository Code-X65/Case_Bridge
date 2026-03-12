import { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => string;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        if (type !== 'loading') {
            setTimeout(() => dismiss(id), 5000);
        }
        return id;
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast, dismiss }}>
            {children}
            <div className="fixed bottom-8 right-8 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: 20, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            className={`pointer-events-auto min-w-[320px] max-w-md bg-[#1E293B] border border-white/10 shadow-2xl rounded-2xl p-4 flex items-start gap-3 backdrop-blur-xl`}
                        >
                            <div className={`mt-0.5 shrink-0 ${t.type === 'success' ? 'text-emerald-400' :
                                t.type === 'error' ? 'text-red-400' :
                                    t.type === 'loading' ? 'text-indigo-400' : 'text-indigo-400'
                                }`}>
                                {t.type === 'success' && <CheckCircle2 size={20} />}
                                {t.type === 'error' && <AlertCircle size={20} />}
                                {t.type === 'info' && <Info size={20} />}
                                {t.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
                            </div>

                            <div className="flex-1">
                                <p className="text-sm font-bold text-white pr-6">{t.message}</p>
                            </div>

                            <button
                                onClick={() => dismiss(t.id)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>

                            {/* Progress bar background for auto-dismiss */}
                            {t.type !== 'loading' && (
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: 0 }}
                                    transition={{ duration: 5, ease: 'linear' }}
                                    className={`absolute bottom-0 left-0 h-1 rounded-b-2xl ${t.type === 'success' ? 'bg-emerald-500' :
                                        t.type === 'error' ? 'bg-red-500' : 'bg-indigo-500'
                                        }`}
                                />
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
