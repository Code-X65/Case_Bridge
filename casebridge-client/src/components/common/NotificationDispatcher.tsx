import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './ToastService';

export default function NotificationDispatcher() {
    const { user } = useAuth();
    const { toast } = useToast();
    const lastCheckRef = useRef<string>(new Date().toISOString());
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (!user) return;

        const poll = async () => {
            if (!navigator.onLine) return; // Skip polling if offline

            try {
                // Fetch user's matter IDs for update tracking
                const matterRes = await fetch(`${API_URL}/matters?client_id=${user.id}`);
                const matterResult = await matterRes.json();
                const matterIds = (matterResult.data || []).map((m: any) => m.id).join(',');

                const pollRes = await fetch(
                    `${API_URL}/workspace/poll?client_id=${user.id}&matter_ids=${matterIds}&last_check=${lastCheckRef.current}`
                );
                const pollResult = await pollRes.json();

                if (pollResult.success) {
                    const { notifications, updates } = pollResult.data;

                    // Show alerts for new notifications
                    notifications.forEach((n: any) => {
                        toast(`New Notification: ${n.title}`, 'success');
                    });

                    // Show alerts for matter updates
                    updates.forEach((u: any) => {
                        toast(`Update on ${u.matter?.title || 'Case'}: ${u.title}`, 'info');
                    });

                    // Update last check timestamp
                    lastCheckRef.current = pollResult.timestamp;
                }
            } catch (err) {
                // Network errors like "Failed to fetch" are common when flickering, so we suppress redundant logging
                if (err instanceof TypeError && err.message === 'Failed to fetch') {
                    // Suppress noisy network failure logs
                    return;
                }
                console.error("Polling Error:", err);
            }
        };

        // Initial poll
        poll();

        // 10s Interval
        const interval = setInterval(poll, 10000);

        return () => clearInterval(interval);
    }, [user, API_URL]);

    return null; // Side-effect only component
}
