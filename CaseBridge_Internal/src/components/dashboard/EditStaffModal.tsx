import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, User, X, Shield, Save } from 'lucide-react';
import type { UserRole } from '@/types/internal';

interface EditStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMember: UserRole | null;
}

export default function EditStaffModal({ isOpen, onClose, staffMember }: EditStaffModalProps) {
    const queryClient = useQueryClient();
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (staffMember) {
            setFullName(staffMember.profiles?.full_name || '');
            setRole(staffMember.role);
        }
    }, [staffMember]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!staffMember) return;
            setError(null);

            const { data, error: rpcError } = await supabase.rpc('update_staff_member', {
                p_user_id: staffMember.user_id,
                p_full_name: fullName,
                p_role: role
            });

            if (rpcError) throw rpcError;
            if (data?.success === false) throw new Error(data.error || 'Failed to update staff member');

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['firm_users'] });
            onClose();
        },
        onError: (err: any) => {
            console.error('Update failed:', err);
            setError(err.message || 'Failed to update staff member.');
        }
    });

    if (!isOpen || !staffMember) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Edit Staff Details</h2>
                        <p className="text-xs text-slate-400 lowercase">{staffMember.profiles?.email}</p>
                    </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition-colors"
                            placeholder="Jane Doe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role Permissions</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 pl-10 text-white focus:border-indigo-500 outline-none transition-colors appearance-none"
                            >
                                <option value="associate_lawyer">Associate Lawyer</option>
                                <option value="case_manager">Case Manager</option>
                                <option value="admin_manager">Administrator</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
