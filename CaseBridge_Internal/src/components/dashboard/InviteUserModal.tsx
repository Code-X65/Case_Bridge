import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, X, Check, Copy } from 'lucide-react';
import { useInternalSession } from '@/hooks/useInternalSession';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
    const { session } = useInternalSession();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'case_manager' | 'associate_lawyer'>('associate_lawyer');
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    const inviteMutation = useMutation({
        mutationFn: async () => {
            if (!session) throw new Error('No session');

            const { data, error } = await supabase.rpc('create_secure_invitation', {
                p_email: email,
                p_role: role,
                p_firm_id: session.firm_id
            });

            if (error) throw error;
            return data as string; // returns the token
        },
        onSuccess: (token) => {
            queryClient.invalidateQueries({ queryKey: ['firm_invitations'] });
            setGeneratedLink(`${window.location.origin}/auth/accept-invite?token=${token}`);
        },
    });

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink);
            alert('Link copied to clipboard!');
        }
    };

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
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Invitation Created!</h3>
                        <p className="text-sm text-slate-400 mb-6">Share this link with your colleague to join.</p>

                        <div className="bg-slate-900 p-4 rounded-xl border border-white/10 flex items-center gap-3 mb-6">
                            <code className="text-xs text-indigo-300 truncate flex-1 block text-left">
                                {generatedLink}
                            </code>
                            <button onClick={copyToClipboard} className="text-slate-400 hover:text-white p-2">
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
