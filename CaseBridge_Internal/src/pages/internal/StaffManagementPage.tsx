import { useState } from 'react';
import { useInternalSession } from '@/hooks/useInternalSession';
import { useStaffManagement } from '@/hooks/useStaffManagement';
import { Plus } from 'lucide-react';
import InviteUserModal from '@/components/dashboard/InviteUserModal';
import EditStaffModal from '@/components/dashboard/EditStaffModal';
import InternalSidebar from '@/components/layout/InternalSidebar';
import StaffList from '@/components/dashboard/StaffList';
import InviteList from '@/components/dashboard/InviteList';
import { useToast } from '@/components/common/ToastService';
import { useConfirm } from '@/components/common/ConfirmDialogProvider';
import type { UserRole, Invitation } from '@/types/internal';

export default function StaffManagementPage() {
    const { session } = useInternalSession();
    const { toast } = useToast();
    const { confirm } = useConfirm();
    const {
        users, isUsersLoading,
        invites, isInvitesLoading,
        revokeInvite, resendInvite, toggleStaffStatus, deleteStaff
    } = useStaffManagement(session?.firm_id);

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<UserRole | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);

    const handleResend = (invite: Invitation) => {
        resendInvite.mutate({ invite, origin: window.location.origin }, {
            onSuccess: () => toast('Invitation resent successfully', 'success'),
            onError: (err: any) => toast(`Resend failed: ${err.message}`, 'error')
        });
    };

    const handleToggleStatus = async (userId: string, status: string, role: string) => {
        if (role === 'admin_manager') return;
        const confirmed = await confirm({ title: 'Change Status', message: status === 'suspended' ? 'Suspend this staff member?' : 'Reactivate this staff member?', confirmText: status === 'suspended' ? 'Suspend' : 'Reactivate', isDangerous: status === 'suspended' });
        if (confirmed) {
            toggleStaffStatus.mutate({ userId, status }, {
                onSuccess: () => {
                    toast(`Staff ${status === 'suspended' ? 'suspended' : 'reactivated'} successfully`, 'success');
                    setActionMenuId(null);
                },
                onError: (err: any) => toast(`Update failed: ${err.message}`, 'error')
            });
        }
    };

    const handleDeleteStaff = async (userId: string, role: string) => {
        if (role === 'admin_manager') return;
        if (await confirm({ title: 'Remove Staff', message: 'Permanently remove this staff member?', confirmText: 'Remove', isDangerous: true })) {
            deleteStaff.mutate(userId, {
                onSuccess: () => {
                    toast('Staff member removed successfully', 'success');
                    setActionMenuId(null);
                },
                onError: (err: any) => toast(`Deletion failed: ${err.message}`, 'error')
            });
        }
    };

    const handleCopyInviteLink = (token: string) => {
        const link = `${window.location.origin}/auth/accept-invite?token=${token}`;
        navigator.clipboard.writeText(link);
        toast('Link copied to clipboard', 'success');
    };

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
                    <StaffList
                        users={users}
                        isLoading={isUsersLoading}
                        actionMenuId={actionMenuId}
                        setActionMenuId={setActionMenuId}
                        onEdit={setEditingStaff}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDeleteStaff}
                    />

                    <InviteList
                        invites={invites}
                        users={users}
                        isLoading={isInvitesLoading}
                        isResending={resendInvite.isPending}
                        onCopyLink={handleCopyInviteLink}
                        onResend={handleResend}
                        onRevoke={async (id) => (await confirm({ title: 'Revoke Invite', message: 'Revoke invite?', confirmText: 'Revoke', isDangerous: true })) && revokeInvite.mutate(id)}
                    />
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
