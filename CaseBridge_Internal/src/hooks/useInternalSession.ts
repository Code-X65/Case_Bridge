import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface InternalSession {
    id: string;
    user_id: string;
    firm_id: string;
    role: string;
    token: string;
    expires_at: string;
    email?: string;
    full_name?: string;
}

export function useInternalSession() {
    const queryClient = useQueryClient();

    const { data: session, isLoading } = useQuery({
        queryKey: ['internal_session'],
        queryFn: async () => {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return null;

            const { data, error } = await supabase
                .from('internal_sessions')
                .select('*, profile:profiles(email, full_name)')
                .eq('user_id', authSession.user.id)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('Error fetching internal session:', error);
                return null;
            }

            if (data) {
                const sessionData = {
                    ...data,
                    email: data.profile?.email,
                    full_name: data.profile?.full_name
                };
                delete sessionData.profile;
                return sessionData as InternalSession;
            }

            return null;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
    });

    const createSession = useMutation({
        mutationFn: async ({ firmId, role }: { firmId: string; role: string }) => {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) throw new Error('Not authenticated');

            // Generate a secure token
            const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

            const { data, error } = await supabase
                .from('internal_sessions')
                .insert({
                    user_id: authSession.user.id,
                    firm_id: firmId,
                    role: role,
                    token: token,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal_session'] });
        },
    });

    const clearSession = useMutation({
        mutationFn: async () => {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) return;

            await supabase
                .from('internal_sessions')
                .delete()
                .eq('user_id', authSession.user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['internal_session'] });
        },
    });

    return {
        session,
        isLoading,
        createSession,
        clearSession,
    };
}
