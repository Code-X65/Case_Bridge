import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const IDLE_TIME_MS = 120 * 1000; // 120 seconds

export const IdleTimer = () => {
    const { signOut, session, isInternal } = useAuth();
    const navigate = useNavigate();
    const lastActivity = useRef<number>(Date.now());
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleActivity = () => {
        lastActivity.current = Date.now();
    };

    const logout = async () => {
        console.log('⏰ Inactivity detected. Logging out...');
        if (timerRef.current) clearInterval(timerRef.current);
        await signOut();
        navigate('/login');
    };

    useEffect(() => {
        if (!session || isInternal) return;

        const events = [
            'mousedown',
            'mousemove',
            'keydown',
            'scroll',
            'touchstart'
        ];

        // Reset timer on any of these events
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Set up interval to check for inactivity
        timerRef.current = setInterval(() => {
            const now = Date.now();
            const inactiveTime = now - lastActivity.current;

            if (inactiveTime >= IDLE_TIME_MS) {
                logout();
            }
        }, 1000);

        // Visibility change handling
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // When coming back to the tab, check if we should have logged out
                const now = Date.now();
                const inactiveTime = now - lastActivity.current;
                if (inactiveTime >= IDLE_TIME_MS) {
                    logout();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [session, signOut, navigate]);

    return null;
};
