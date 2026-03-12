import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from './ToastService';
import { WifiOff } from 'lucide-react';

export default function NetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const { toast, dismiss } = useToast();
    const lastToastId = useRef<string | null>(null);
    const lastNotificationTime = useRef<number>(0);

    const checkAndNotify = useCallback(() => {
        const now = Date.now();
        // 5 minutes = 300,000 ms
        if (!navigator.onLine && (now - lastNotificationTime.current >= 300000)) {
            if (lastToastId.current) dismiss(lastToastId.current);
            
            lastToastId.current = toast(
                "You are currently offline. Some features may be limited until connection is restored.", 
                "error"
            );
            lastNotificationTime.current = now;
        }
    }, [toast, dismiss]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (lastToastId.current) {
                dismiss(lastToastId.current);
                lastToastId.current = null;
            }
            toast("Connection restored.", "success");
        };

        const handleOffline = () => {
            setIsOnline(false);
            checkAndNotify();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodically check if still offline to satisfy the 5-min interval requirement
        const interval = setInterval(() => {
            if (!navigator.onLine) {
                checkAndNotify();
            }
        }, 60000); // Check every minute, but checkAndNotify handles the 5-min logic

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [toast, dismiss, checkAndNotify]);

    return null; // This component doesn't render anything itself, it just manages toast notifications
}
