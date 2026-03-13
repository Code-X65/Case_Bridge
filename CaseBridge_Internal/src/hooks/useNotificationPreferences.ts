
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useInternalSession } from './useInternalSession';
import type { NotificationCategory } from './useNotifications';

export interface NotificationPreference {
    id: string;
    user_id: string;
    category: NotificationCategory;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    updated_at: string;
}

export function useNotificationPreferences() {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notification_preferences', session?.user_id],
        enabled: !!session?.user_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', session!.user_id);

            if (error) throw error;
            return data as NotificationPreference[];
        }
    });

    const updatePreference = useMutation({
        mutationFn: async (payload: Partial<NotificationPreference> & { category: NotificationCategory }) => {
            const { error } = await supabase
                .from('notification_preferences')
                .upsert({
                    user_id: session!.user_id,
                    category: payload.category,
                    email_enabled: payload.email_enabled,
                    push_enabled: payload.push_enabled,
                    in_app_enabled: payload.in_app_enabled,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, category' });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification_preferences'] });
        }
    });

    return {
        preferences,
        isLoading,
        updatePreference
    };
}
