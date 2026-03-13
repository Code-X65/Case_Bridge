import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './ToastService';

export default function NotificationDispatcher() {
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        // Subscribed to both Notifications and Matter Updates
        const notificationChannel = supabase
            .channel(`user_notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload: any) => {
                    toast(`New Notification: ${payload.new.payload?.title || 'System Alert'}`, 'success');
                }
            )
            .subscribe();

        const updateChannel = supabase
            .channel(`client_matter_updates:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matter_updates'
                },
                async (payload: any) => {
                    // Only show alert if user is part of the matter
                    const { data: matter } = await supabase
                        .from('matters')
                        .select('title')
                        .eq('id', payload.new.matter_id)
                        .eq('client_id', user.id)
                        .single();

                    if (matter) {
                        toast(`Update on ${matter.title}: ${payload.new.title}`, 'info');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(notificationChannel);
            supabase.removeChannel(updateChannel);
        };
    }, [user]);

    return null; // Side-effect only component
}
