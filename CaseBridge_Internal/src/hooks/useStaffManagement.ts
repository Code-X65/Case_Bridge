import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { UserRole, Invitation } from '@/types/internal';

export function useStaffManagement(firmId: string | undefined) {
    const queryClient = useQueryClient();

    // 1. Fetch Active Users
    const usersQuery = useQuery<UserRole[]>({
        queryKey: ['firm_users', firmId],
        enabled: !!firmId,
        queryFn: async () => {
            const { data } = await supabase
                .from('user_firm_roles')
                .select('id, user_id, status, role, profiles:user_id(id, full_name, email, onboarding_state, status)')
                .eq('firm_id', firmId!)
                .neq('status', 'deleted');
            return (data as unknown as UserRole[]) || [];
        }
    });

    // 2. Fetch Pending Invites
    const invitesQuery = useQuery<Invitation[]>({
        queryKey: ['firm_invitations', firmId],
        enabled: !!firmId,
        queryFn: async () => {
            const { data } = await supabase
                .from('invitations')
                .select('*')
                .eq('firm_id', firmId!)
                .in('status', ['pending', 'expired']);
            return (data as unknown as Invitation[]) || [];
        }
    });

    // 3. Mutations
    const revokeInvite = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc('revoke_secure_invitation', {
                p_invite_id: id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
        }
    });

    const resendInvite = useMutation({
        mutationFn: async ({ invite, origin }: { invite: Invitation, origin: string }) => {
            const { data, error } = await supabase.rpc('secure_supabase_invite', {
                p_email: invite.email,
                p_role: invite.role_preassigned,
                p_firm_id: firmId!,
                p_first_name: invite.first_name,
                p_last_name: invite.last_name,
                p_redirect_to: `${origin}/auth/accept-invite`
            });

            if (error) throw error;
            if (data?.success === false) throw new Error(data.error || 'Failed to resend invitation');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
        }
    });

    const toggleStaffStatus = useMutation({
        mutationFn: async ({ userId, status }: { userId: string, status: string }) => {
            const { data, error } = await supabase.rpc('set_staff_status', {
                p_user_id: userId,
                p_status: status,
                p_firm_id: firmId
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
        }
    });

    const deleteStaff = useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase.rpc('delete_staff_member_native', {
                p_user_id: userId,
                p_firm_id: firmId
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
        }
    });

    return {
        users: usersQuery.data,
        isUsersLoading: usersQuery.isLoading,
        invites: invitesQuery.data,
        isInvitesLoading: invitesQuery.isLoading,
        revokeInvite,
        resendInvite,
        toggleStaffStatus,
        deleteStaff
    };
}
