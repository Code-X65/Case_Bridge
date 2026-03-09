import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type ConnectivityState = {
    isOnline: boolean;
    isRealtimeConnected: boolean;
    lastError: string | null;
    setRealtimeStatus: (status: boolean, error?: string | null) => void;
};

const ConnectivityContext = createContext<ConnectivityState | undefined>(undefined);

export const ConnectivityProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
    const [lastError, setLastError] = useState<string | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const setRealtimeStatus = useCallback((status: boolean, error: string | null = null) => {
        setIsRealtimeConnected(status);
        setLastError(error);
    }, []);

    return (
        <ConnectivityContext.Provider value={{ isOnline, isRealtimeConnected, lastError, setRealtimeStatus }}>
            {children}
        </ConnectivityContext.Provider>
    );
};

export const useConnectivity = () => {
    const context = useContext(ConnectivityContext);
    if (context === undefined) {
        throw new Error('useConnectivity must be used within a ConnectivityProvider');
    }
    return context;
};
