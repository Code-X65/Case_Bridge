import { Link as LinkIcon, RefreshCw, Trash2, Clock } from 'lucide-react';
import type { Invitation, UserRole } from '@/types/internal';
import Skeleton from '@/components/ui/Skeleton';

interface InviteListProps {
    invites: Invitation[] | undefined;
    users: UserRole[] | undefined;
    isLoading: boolean;
    isResending: boolean;
    onCopyLink: (token: string) => void;
    onResend: (invite: Invitation) => void;
    onRevoke: (id: string) => void;
}

export default function InviteList({
    invites,
    users,
    isLoading,
    isResending,
    onCopyLink,
    onResend,
    onRevoke
}: InviteListProps) {
    const pendingInvites = invites?.filter(invite => !users?.some(user => user.profiles?.email === invite.email)) || [];

    return (
        <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Invitations ({pendingInvites.length})
            </h3>
            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 border-l-4 border-l-yellow-500/30">
                {isLoading ? (
                    <div className="grid gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {pendingInvites.map((invite) => (
                            <div key={invite.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-white">{invite.email}</p>
                                    <p className="text-xs text-slate-500">Invited as <span className="capitalize">{invite.role_preassigned.replace('_', ' ')}</span></p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onCopyLink(invite.token)}
                                        className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                        title="Copy Invite Link"
                                    >
                                        <LinkIcon className="w-4 h-4 opacity-70" />
                                    </button>
                                    <button
                                        onClick={() => onResend(invite)}
                                        disabled={isResending}
                                        className="p-2.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all disabled:opacity-50"
                                        title="Resend Invitation (Reset 20m Timer)"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => onRevoke(invite.id)}
                                        className="p-2.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                                        title="Revoke Invite"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pendingInvites.length === 0 && <p className="text-slate-500 text-sm italic">No pending invitations.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}
