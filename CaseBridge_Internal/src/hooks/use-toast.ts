import { useState, useCallback } from 'react';

export interface Toast {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

let toastCallback: ((toast: Toast) => void) | null = null;

export function toast(props: Toast) {
    if (toastCallback) {
        toastCallback(props);
    } else {
        // Fallback to console if toast system not initialized
        console.log('[Toast]', props.title, props.description);
    }
}

export function useToast() {
    const [toasts, setToasts] = useState<(Toast & { id: string })[]>([]);

    const showToast = useCallback((toast: Toast) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { ...toast, id }]);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    // Register the callback
    toastCallback = showToast;

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return {
        toasts,
        toast: showToast,
        dismiss,
    };
}
