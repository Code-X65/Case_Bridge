import { useEffect, useRef } from 'react';
import { useInternalSession } from '../../hooks/useInternalSession';
import { useToast } from '../common/ToastService';

export default function InternalNotificationDispatcher() {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const lastCheckRef = useRef<string>(new Date().toISOString());
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (!session?.user_id) return;

        const poll = async () => {
            try {
                // For internal portal, we might want to track ALL matters the user is assigned to
                const matterRes = await fetch(`${API_URL}/matters`); 
                const matterResult = await matterRes.json();
                
                // If the user is an admin/case manager, they might see ALL matters. 
                // For polling, let's just track the ones returned by /matters (which might be filtered by role)
                const matterIds = (matterResult.data || []).map((m: any) => m.id).join(',');

                const pollRes = await fetch(
                    `${API_URL}/workspace/poll?matter_ids=${matterIds}&last_check=${lastCheckRef.current}`
                );
                const pollResult = await pollRes.json();

                if (pollResult.success) {
                    const { updates } = pollResult.data;

                    // Show alerts for matter updates
                    updates.forEach((u: any) => {
                        toast(`New Update on ${u.matter?.title || 'Case'}: ${u.title}`, 'info');
                    });

                    // Update last check timestamp
                    lastCheckRef.current = pollResult.timestamp;
                }
            } catch (err) {
                console.error("Internal Polling Error:", err);
            }
        };

        // Initial poll
        poll();

        // 10s Interval
        const interval = setInterval(poll, 10000);

        return () => clearInterval(interval);
    }, [session?.user_id, API_URL]);

    return null;
}
