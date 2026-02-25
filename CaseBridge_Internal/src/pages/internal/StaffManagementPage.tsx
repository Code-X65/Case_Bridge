import { useState } from 'react';
import { useInternalSession } from '@/hooks/useInternalSession';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, RefreshCw, Link as LinkIcon, BadgeCheck, Clock, User, MoreVertical, Edit2, ShieldOff, ShieldCheck as ShieldIcon } from 'lucide-react';
import InviteUserModal from '@/components/dashboard/InviteUserModal';
import EditStaffModal from '@/components/dashboard/EditStaffModal';
import InternalSidebar from '@/components/layout/InternalSidebar';
import type { UserRole, Invitation } from '@/types/internal';

export default function StaffManagementPage() {
    const { session } = useInternalSession();
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<UserRole | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch Active Users
    const { data: users, isLoading: usersLoading } = useQuery<UserRole[]>({
        queryKey: ['firm_users', session?.firm_id],
        enabled: !!session?.firm_id,
        queryFn: async () => {
            const { data } = await supabase
                .from('user_firm_roles')
                .select('id, user_id, status, role, profiles:user_id(id, full_name, email, onboarding_state, status)')
                .eq('firm_id', session!.firm_id)
                .neq('status', 'deleted');
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
            const { data, error } = await supabase.rpc('secure_supabase_invite', {
                p_email: invite.email,
                p_role: invite.role_preassigned,
                p_firm_id: session!.firm_id,
                p_first_name: invite.first_name,
                p_last_name: invite.last_name,
                p_redirect_to: `${window.location.origin}/auth/accept-invite`
            });

            if (error) throw error;
            if (data?.success === false) {
                console.error('Resend failed:', data);
                throw new Error(data.error || 'Failed to resend invitation');
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
            alert('Invitation resent via Supabase.');
        }
    });

    const toggleStaffStatus = useMutation({
        mutationFn: async ({ userId, status }: { userId: string, status: string }) => {
            console.log('Toggling staff status:', { userId, status, firmId: session?.firm_id });
            const { data, error } = await supabase.rpc('set_staff_status', {
                p_user_id: userId,
                p_status: status,
                p_firm_id: session?.firm_id
            });
            if (error) {
                console.error('RPC Error (set_staff_status):', error);
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
            setActionMenuId(null);
        },
        onError: (error: any) => {
            alert(`Failed up update status: ${error.message} (${error.code || 'No code'})`);
        }
    });

    const deleteStaff = useMutation({
        mutationFn: async (userId: string) => {
            const { data, error } = await supabase.rpc('delete_staff_member_native', {
                p_user_id: userId,
                p_firm_id: session!.firm_id
            });
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
            alert(data?.auth_deleted ? 'Staff member removed and account revoked.' : 'Staff member removed from firm.');
            setActionMenuId(null);
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
                                            <div className="flex items-center gap-4 relative">
                                                <div className="flex items-center gap-2 mr-4 text-right">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'admin_manager' ? 'bg-purple-500/20 text-purple-400' :
                                                        user.role === 'case_manager' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-slate-500/20 text-slate-400'
                                                        }`}>
                                                        {user.role.replace('_', ' ')}
                                                    </span>
                                                    {user.profiles?.status === 'suspended' ? (
                                                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-[10px] font-bold uppercase tracking-widest border border-yellow-500/20">Suspended</span>
                                                    ) : (
                                                        <BadgeCheck className="w-5 h-5 text-green-400" />
                                                    )}
                                                </div>

                                                <div className="relative">
                                                    <button
                                                        onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        <MoreVertical className="w-5 h-5" />
                                                    </button>

                                                    {actionMenuId === user.id && (
                                                        <div className="absolute right-0 mt-2 w-52 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden py-1 animate-in fade-in zoom-in duration-150">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingStaff(user);
                                                                    setActionMenuId(null);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white text-left transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" /> Edit Details
                                                            </button>

                                                            {user.profiles?.status === 'suspended' ? (
                                                                <button
                                                                    onClick={() => toggleStaffStatus.mutate({ userId: user.user_id, status: 'active' })}
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-400 hover:bg-green-500/10 text-left transition-colors font-medium border-y border-white/5"
                                                                >
                                                                    <ShieldIcon className="w-4 h-4" /> Reactivate Access
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    disabled={user.role === 'admin_manager'}
                                                                    onClick={() => {
                                                                        if (confirm('Suspend this staff member? They will lose dashboard access immediately.')) {
                                                                            toggleStaffStatus.mutate({ userId: user.user_id, status: 'suspended' });
                                                                        }
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/10 text-left transition-colors font-medium border-y border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <ShieldOff className="w-4 h-4" /> Suspend Access
                                                                </button>
                                                            )}

                                                            <button
                                                                disabled={user.role === 'admin_manager'}
                                                                onClick={() => {
                                                                    if (confirm('Permanently remove this staff member? This will revoke their account but keep their historical records.')) {
                                                                        deleteStaff.mutate(user.user_id);
                                                                    }
                                                                }}
                                                                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 text-left transition-colors font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Remove Firm
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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
                            Pending Invitations ({(invites?.filter(i => !users?.some(u => u.profiles?.email === i.email)).length) || 0})
                        </h3>
                        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 border-l-4 border-l-yellow-500/30">
                            {invitesLoading ? (
                                <p className="text-slate-500">Loading invites...</p>
                            ) : (
                                <div className="grid gap-4">
                                    {invites?.filter(invite => !users?.some(user => user.profiles?.email === invite.email)).map((invite) => (
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
                                    {(!invites || invites.filter(i => !users?.some(u => u.profiles?.email === i.email)).length === 0) && <p className="text-slate-500 text-sm italic">No pending invitations.</p>}
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

            <EditStaffModal
                isOpen={!!editingStaff}
                onClose={() => setEditingStaff(null)}
                staffMember={editingStaff}
            />
        </div>
    );
}
