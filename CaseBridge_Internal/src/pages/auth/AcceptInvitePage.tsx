import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
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
    const navigate = useNavigate();
    const [isSuccess, setIsSuccess] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // 1. Listen for auth state changes and fetch session
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useState(() => {
        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
            if (session) console.log('Found existing session on mount:', session.user.email);
        });

        // Listen for redirect login
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth State Change Event:', event, session?.user?.email);
            if (session) {
                setSession(session);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    });

    const user = session?.user;
    const metadata = user?.user_metadata;

    // Form Setup
    const { register, handleSubmit, formState: { errors } } = useForm<AcceptInviteForm>({
        resolver: zodResolver(acceptInviteSchema)
    });

    // Password Update Mutation (Native Flow)
    const updatePasswordMutation = useMutation({
        mutationFn: async (data: AcceptInviteForm) => {
            const { error } = await supabase.auth.updateUser({
                password: data.password
            });
            if (error) throw error;
            return true;
        },
        onSuccess: () => {
            setIsSuccess(true);
        },
        onError: (error: any) => {
            setAuthError(error.message || 'Failed to update password.');
        }
    });

    if (isLoading) { // Changed sessionLoading to isLoading
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-white mb-4">Invalid or Expired Link</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        This invitation link has either expired or is invalid.
                        Please ask your administrator to send a new invitation.
                    </p>
                    <button
                        onClick={() => navigate('/internal/login')}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-center p-10">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                        <ShieldCheck className="w-10 h-10 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4">Account Ready!</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Your password has been set successfully. <br />
                        You can now access your dashboard.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/internal/login')}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

            <div className="w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl relative z-10 overflow-hidden">
                <div className="bg-indigo-600/10 border-b border-indigo-500/10 p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                        <ShieldCheck className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">Complete Your Setup</h1>
                    <p className="text-indigo-200 text-sm">
                        You've been invited to join <br />
                        <strong className="text-white text-lg block mt-1">CaseBridge Legal Firm</strong>
                    </p>
                </div>

                <div className="p-8">
                    <div className="mb-8 p-4 bg-slate-900/50 rounded-xl border border-white/5 space-y-3">
                        <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-indigo-400" />
                            <p className="text-sm text-slate-300">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            <p className="text-sm text-slate-300 capitalize">{metadata?.role?.replace('_', ' ') || 'Staff Member'}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Set Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    {...register('password')}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-10 pr-12 text-white focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    {...register('confirmPassword')}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-10 pr-12 text-white focus:border-indigo-500 outline-none transition-colors"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                        </div>

                        {authError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={updatePasswordMutation.isPending}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                        >
                            {updatePasswordMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Finalize Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
