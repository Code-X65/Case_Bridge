import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useInternalSession } from '../../hooks/useInternalSession';
import { useToast } from '../common/ToastService';

export default function InternalNotificationDispatcher() {
    const { session } = useInternalSession();
    const { toast } = useToast();

    useEffect(() => {
        if (!session?.user_id) return;

        // Subscribe to matter_updates for real-time alerts
        const channel = supabase
            .channel('internal_matter_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'matter_updates'
                },
                async (payload: any) => {
                    // Fetch matter title for the toast
                    const { data: matter } = await supabase
                        .from('matters')
                        .select('title')
                        .eq('id', payload.new.matter_id)
                        .single();

                    toast(`New Update on ${matter?.title || 'Case'}: ${payload.new.title}`, 'info');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user_id]);

    return null;
}
