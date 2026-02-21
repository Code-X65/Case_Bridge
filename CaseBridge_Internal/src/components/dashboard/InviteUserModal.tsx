import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, X, Check } from 'lucide-react';
import { useInternalSession } from '@/hooks/useInternalSession';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState<'case_manager' | 'associate_lawyer'>('associate_lawyer');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    const inviteMutation = useMutation({
        mutationFn: async () => {
            setError(null);
            if (!session) throw new Error('No valid internal session found. Please re-login.');

            const redirectTo = `${window.location.origin}/auth/accept-invite`;
            console.log('Sending invitation with redirectTo:', redirectTo);

            const { data, error: rpcError } = await supabase.rpc('secure_supabase_invite', {
                p_email: email,
                p_role: role,
                p_firm_id: session.firm_id,
                p_first_name: firstName,
                p_last_name: lastName,
                p_redirect_to: redirectTo
            });

            if (rpcError) throw rpcError;
            if (data?.success === false) {
                console.error('Invitation RPC returned error:', data);
                throw new Error(data.error || 'The invitation service returned an error. Please try again.');
            }

            return data;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
            setGeneratedLink('sent_via_supabase');
        },
        onError: (err: any) => {
            console.error('Invite failed:', err);
            setError(err.message || 'Failed to send invitation. Please check your connection or permissions.');
        }
    });


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-1">Invite Team Member</h2>
                <p className="text-sm text-slate-400 mb-6">Send an invitation to join your firm's workspace.</p>

                {!generatedLink ? (
                    <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                    placeholder="Jane"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                                placeholder="colleague@firm.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as any)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                            >
                                <option value="associate_lawyer">Associate Lawyer</option>
                                <option value="case_manager">Case Manager</option>
                            </select>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={inviteMutation.isPending}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {inviteMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating Invite...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-4 h-4" />
                                    Send Invitation
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">Invitation Sent!</h3>
                        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                            Supabase has sent a secure invitation email to <br />
                            <strong className="text-indigo-400">{email}</strong>. <br />
                            The recipient can now join and verify their account.
                        </p>

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
