import { useState } from 'react';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, RefreshCw, Link as LinkIcon, BadgeCheck, Clock, User } from 'lucide-react';
import InviteUserModal from '@/components/dashboard/InviteUserModal';
import InternalSidebar from '@/components/layout/InternalSidebar';
import type { UserRole, Invitation } from '@/types/internal';
import { sendEmail } from '@/lib/emailjs';

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
            // 1. RPC to regenerate token in DB
            const { data: newLink, error } = await supabase.rpc('resend_secure_invitation', {
                p_invite_id: invite.id,
                p_redirect_to: `${window.location.origin}/auth/accept-invite`
            });
            if (error) throw error;

            // 2. Resend via EmailJS
            const { data: firmData } = await supabase.from('firms').select('name').eq('id', session?.firm_id).single();
            await sendEmail(import.meta.env.VITE_EMAILJS_TEMPLATE_ID_STAFF_INVITE || 'internal_staff_invite', {
                to_email: invite.email,
                staff_name: `${invite.first_name || ''} ${invite.last_name || ''}`.trim() || 'Team Member',
                firm_name: firmData?.name || 'CaseBridge Firm',
                invite_link: newLink,
                role: invite.role_preassigned.replace('_', ' ')
            });

            return newLink;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
            alert('Invitation renewed and email resent via EmailJS.');
        }
    });

    const deleteStaff = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase.rpc('delete_staff_member', {
                p_user_id: userId,
                p_firm_id: session!.firm_id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
            alert('Staff member removed.');
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

                <div className="grid gap-8">
                    {/* Active Staff Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Active Staff ({users?.length || 0})
                        </h3>
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
                            {usersLoading ? (
                                <p className="text-slate-500">Loading team...</p>
                            ) : (
                                <div className="grid gap-4">
                                    {users?.map((user) => (
                                        <div key={user.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold">
                                                    {user.profiles?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{user.profiles?.full_name || 'Unknown User'}</p>
                                                    <p className="text-xs text-slate-500 lowercase">{user.profiles?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'admin_manager' ? 'bg-purple-500/20 text-purple-400' :
                                                        user.role === 'case_manager' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                        }`}>
                                                        {user.role.replace('_', ' ')}
                                                    </span>
                                                    <BadgeCheck className="w-5 h-5 text-green-400" />
                                                </div>
                                                {user.role !== 'admin_manager' && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this staff member and all their permissions?')) {
                                                                deleteStaff.mutate(user.id);
                                                            }
                                                        }}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ms-4"
                                                        title="Delete Staff"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {users?.length === 0 && <p className="text-slate-500 text-sm italic">No active staff members.</p>}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Pending Invites Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Pending Invitations ({invites?.length || 0})
                        </h3>
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 border-l-4 border-l-yellow-500/30">
                            {invitesLoading ? (
                                <p className="text-slate-500">Loading invites...</p>
                            ) : (
                                <div className="grid gap-4">
                                    {invites?.map((invite) => (
                                        <div key={invite.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-white">{invite.email}</p>
                                                <p className="text-xs text-slate-500">Invited as <span className="capitalize">{invite.role_preassigned.replace('_', ' ')}</span></p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        const link = `${window.location.origin}/auth/accept-invite?token=${invite.token}`;
                                                        navigator.clipboard.writeText(link);
                                                        alert('Link copied to clipboard!');
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                                    title="Copy Invite Link"
                                                >
                                                    <LinkIcon className="w-4 h-4 opacity-70" />
                                                </button>
                                                <button
                                                    onClick={() => resendInvite.mutate(invite)}
                                                    className="p-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                    title="Resend Invitation (Reset 20m Timer)"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${resendInvite.isPending ? 'animate-spin' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Revoke this invitation?')) {
                                                            revokeInvite.mutate(invite.id);
                                                        }
                                                    }}
                                                    className="p-2.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                                                    title="Revoke Invite"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {invites?.length === 0 && <p className="text-slate-500 text-sm italic">No pending invitations.</p>}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            <InviteUserModal
                isOpen={isInviteOpen}
                onClose={() => setIsInviteOpen(false)}
            />
        </div>
    );
}
