import { BadgeCheck, Clock, User, Link as LinkIcon } from 'lucide-react';
import type { UserRole, Invitation } from '@/types/internal';

interface UserListProps {
    users: UserRole[];
    invites: Invitation[];
    isLoading: boolean;
}

export default function UserList({ users, invites, isLoading }: UserListProps) {
    if (isLoading) return <div className="text-slate-500">Loading team...</div>;

    return (
        <div className="space-y-8">
            {/* Active Team */}
            <div>

                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Active Team</h3>
                <div className="grid gap-4">
                    {users?.map((user) => (
                        <div key={user.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold">
                                    {user.profiles?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-white">{user.profiles?.full_name || 'Unknown User'}</p>
                                    <p className="text-xs text-slate-500">{user.profiles?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'admin_manager' ? 'bg-purple-500/20 text-purple-400' :
                                    user.role === 'case_manager' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {user.role}
                                </span>
                                <BadgeCheck className="w-5 h-5 text-green-400" />
                            </div>
                        </div>
                    ))}
                    {users?.length === 0 && <p className="text-slate-500 text-sm">No active team members.</p>}
                </div>
            </div>

            {/* Pending Invites */}
            {invites && invites.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Invites</h3>
                    <div className="grid gap-4">
                        {invites.map((invite) => (
                            <div key={invite.id} className="bg-white/5 border border-white/10 border-l-4 border-l-yellow-500 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{invite.email}</p>
                                        <p className="text-xs text-slate-500">Invited as {invite.role_preassigned}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const link = `${window.location.origin}/auth/accept-invite?token=${invite.token}`;
                                            navigator.clipboard.writeText(link);
                                            alert('Invitation link copied to clipboard!');
                                        }}
                                        className="p-2 text-slate-400 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                                        title="Copy Invite Link"
                                    >
                                        <LinkIcon className="w-3.5 h-3.5" />
                                        Copy Link
                                    </button>
                                    <span className="text-xs text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded">PENDING</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
