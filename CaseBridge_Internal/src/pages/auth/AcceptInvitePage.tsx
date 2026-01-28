import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Form Schema
const acceptInviteSchema = z.object({
    password: z.string()
        .min(10, 'Password must be at least 10 characters')
        .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain 1 uppercase, 1 number, and 1 symbol'),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>;

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [authError, setAuthError] = useState<string | null>(null);

    // Fetch Invite Details
    const { data: invite, isLoading, error: inviteError } = useQuery({
        queryKey: ['invite', token],
        enabled: !!token,
        queryFn: async () => {
            // @ts-ignore - Supabase types might not have the RPC yet
            const { data, error } = await supabase.rpc('get_invite_details', {
                p_token: token
            });

            if (error) throw error;
            // RPC returns an array of rows (even if it's one row), so we take the first
            if (!data || data.length === 0) throw new Error('Invalid or expired invitation.');
            return data[0] as { email: string; firm_name: string; role: string };
        },
        retry: false
    });

    // Form Setup
    const { register, handleSubmit, formState: { errors } } = useForm<AcceptInviteForm>({
        resolver: zodResolver(acceptInviteSchema)
    });

    // Signup Mutation
    const signUpMutation = useMutation({
        mutationFn: async (data: AcceptInviteForm) => {
            if (!invite) return;

            // 1. Sign Up (Trigger will handle role assignment)
            const { error: signUpError } = await supabase.auth.signUp({
                email: invite.email,
                password: data.password,
                options: {
                    data: {
                        // Pass metadata if needed, but the trigger relies on email
                    }
                }
            });

            if (signUpError) throw signUpError;
            return true;
        },
        onSuccess: () => {
            navigate('/internal/login', {
                state: { message: 'Account created! Please check your email to confirm your account.' }
            });
        },
        onError: (error: any) => {
            setAuthError(error.message || 'Failed to create account.');
        }
    });

    if (!token) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
                    <p className="text-slate-400 mb-6">This invitation link is missing a token.</p>
                    <button onClick={() => navigate('/internal/login')} className="text-sm font-bold text-red-400 hover:text-red-300">
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (inviteError || !invite) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Invitation Expired or Invalid</h2>
                    <p className="text-slate-400 mb-6">
                        {(inviteError as any)?.message || "We couldn't find a valid pending invitation for this link."}
                    </p>
                    <button onClick={() => navigate('/internal/login')} className="text-sm font-bold text-red-400 hover:text-red-300">
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl relative z-10 overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600/10 border-b border-indigo-500/10 p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">Join CaseBridge</h1>
                    <p className="text-indigo-200 text-sm">
                        You've been invited to join <br />
                        <strong className="text-white text-lg block mt-1">{invite.firm_name}</strong>
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-6 flex flex-col gap-2">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Email</p>
                                <p className="text-sm text-slate-300 font-medium">{invite.email}</p>
                            </div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Role</p>
                                <p className="text-sm text-slate-300 font-medium capitalize">{invite.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit((data) => signUpMutation.mutate(data))} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Create Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    {...register('password')}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    {...register('confirmPassword')}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>

                        {authError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={signUpMutation.isPending}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                        >
                            {signUpMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
