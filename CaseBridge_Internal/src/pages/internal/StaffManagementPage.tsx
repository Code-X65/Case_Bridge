import { useState } from 'react';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, RefreshCw, Link as LinkIcon } from 'lucide-react';
import InviteUserModal from '@/components/dashboard/InviteUserModal';
import UserList from '@/components/dashboard/UserList';
import InternalSidebar from '@/components/layout/InternalSidebar';
import type { UserRole, Invitation } from '@/types/internal';

export default function StaffManagementPage() {
    const { session } = useInternalSession();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch Active Users
    const { data: users, isLoading: usersLoading } = useQuery<UserRole[]>({
        queryKey: ['firm_users', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('user_firm_roles')
                .select('*, profiles:user_id(full_name, email, onboarding_state)')
                .eq('firm_id', session!.firm_id);
            return (data as unknown as UserRole[]) || [];
        }
    });

    // Fetch Pending Invites
    const { data: invites, isLoading: invitesLoading } = useQuery<Invitation[]>({
        queryKey: ['firm_invitations', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('invitations')
                .select('*')
                .eq('firm_id', session!.firm_id)
                .in('status', ['pending', 'expired']); // Show expired too so they can be resent
            return (data as unknown as Invitation[]) || [];
        }
    });

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
        mutationFn: async (invite: Invitation) => {
            const { error } = await supabase.rpc('resend_secure_invitation', {
                p_invite_id: invite.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
            alert('Invitation renewed and email resent via Secure Channel.');
        }
    });

    return (
        <div className="min-h-screen bg-[#0F172A] text-white">
            <InternalSidebar />

            <main className="ml-64 p-10 min-h-screen grid gap-10">
                <header className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black mb-2">Staff Management</h2>
                        <p className="text-slate-400">Invite, manage, and remove team members.</p>
                    </div>
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Invite Staff
                    </button>
                </header>

                {/* Active Staff Section */}
                <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Active Staff ({users?.length || 0})
                    </h3>
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
                        <UserList
                            users={users || []}
                            invites={[]} // Don't show invites here, we have a separate section
                            isLoading={usersLoading}
                        />
                    </div>
                </section>

                {/* Pending Invites Section */}
                <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Pending Invitations ({invites?.length || 0})
                    </h3>
                    <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
                        {invitesLoading && <p className="text-slate-500">Loading invites...</p>}

                        {!invitesLoading && invites?.length === 0 && (
                            <p className="text-slate-500 text-sm">No pending invitations.</p>
                        )}

                        <div className="grid gap-4">
                            {invites?.map((invite) => (
                                <div key={invite.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-white">{invite.email}</p>
                                        <p className="text-xs text-slate-500 capitalize">{invite.role_preassigned.replace('_', ' ')}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const link = `${window.location.origin}/auth/accept-invite?token=${invite.token}`;
                                                navigator.clipboard.writeText(link);
                                                alert('Invitation link copied to clipboard!');
                                            }}
                                            className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors"
                                            title="Copy Invite Link"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => resendInvite.mutate(invite)}
                                            className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                            title="Resend & Renew Invite"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm('Are you sure you want to revoke this invite?')) {
                                                    revokeInvite.mutate(invite.id);
                                                }
                                            }}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Revoke Invite"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <InviteUserModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
            />
        </div>
    );
}
