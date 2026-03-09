import { useState, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null);

    const confirm = useCallback((opts: ConfirmOptions | string) => {
        return new Promise<boolean>((resolve) => {
            const parsedOptions = typeof opts === 'string' ? { message: opts } : opts;
            setOptions(parsedOptions);
            setResolver({ resolve });
            setIsOpen(true);
        });
    }, []);

    const handleConfirm = () => {
        if (resolver) resolver.resolve(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolver) resolver.resolve(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 isolate">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={handleCancel}
                        />

                        {/* Dialog */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-[#1E293B] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className={`p-3 rounded-2xl shrink-0 ${options.isDangerous ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <button
                                        onClick={handleCancel}
                                        className="p-2 text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 tracking-tight">
                                    {options.title || 'Please Confirm'}
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    {options.message}
                                </p>
                            </div>

                            <div className="p-6 pt-0 mt-4 flex items-center justify-end gap-3 pointer-events-auto">
                                <button
                                    onClick={handleCancel}
                                    className="px-6 py-2.5 font-bold text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                >
                                    {options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-6 py-2.5 font-bold text-sm text-white rounded-xl transition-all shadow-lg ${options.isDangerous
                                            ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                                        }`}
                                >
                                    {options.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used within ConfirmDialogProvider');
    return context;
};
