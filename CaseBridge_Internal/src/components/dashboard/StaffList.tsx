import { User, MoreVertical, Edit2, ShieldOff, ShieldCheck as ShieldIcon, Trash2, BadgeCheck, Users } from 'lucide-react';
import type { UserRole } from '@/types/internal';
import Skeleton from '@/components/ui/Skeleton';

interface StaffListProps {
    users: UserRole[] | undefined;
    isLoading: boolean;
    actionMenuId: string | null;
    setActionMenuId: (id: string | null) => void;
    onEdit: (user: UserRole) => void;
    onToggleStatus: (userId: string, currentStatus: string, role: string) => void;
    onDelete: (userId: string, role: string) => void;
}

export default function StaffList({
    users,
    isLoading,
    actionMenuId,
    setActionMenuId,
    onEdit,
    onToggleStatus,
    onDelete
}: StaffListProps) {
    return (
        <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Staff ({users?.length || 0})
            </h3>
            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
                {isLoading ? (
                    <div className="grid gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
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
                                                        onEdit(user);
                                                        setActionMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white text-left transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" /> Edit Details
                                                </button>

                                                {user.profiles?.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => onToggleStatus(user.user_id, 'active', user.role)}
                                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-400 hover:bg-green-500/10 text-left transition-colors font-medium border-y border-white/5"
                                                    >
                                                        <ShieldIcon className="w-4 h-4" /> Reactivate Access
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={user.role === 'admin_manager'}
                                                        onClick={() => onToggleStatus(user.user_id, 'suspended', user.role)}
                                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/10 text-left transition-colors font-medium border-y border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ShieldOff className="w-4 h-4" /> Suspend Access
                                                    </button>
                                                )}

                                                <button
                                                    disabled={user.role === 'admin_manager'}
                                                    onClick={() => onDelete(user.user_id, user.role)}
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
    );
}
