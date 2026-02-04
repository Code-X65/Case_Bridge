import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { Loader2, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { resolveUserHome } from '@/utils/navigation';

export default function InternalLoginPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { session, createSession } = useInternalSession();

    useEffect(() => {
        let isMounted = true;
        if (session && isMounted) {
            navigate('/internal/dashboard');
        }
        return () => { isMounted = false; };
    }, [session, navigate]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError(null);

        try {
            // STEP 1: Authenticate with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Authentication failed');

            // STEP 2: Fetch Profile and check status
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('status, onboarding_state, first_login_flag')
                .eq('id', authData.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profile) {
                const { data: pendingReg } = await supabase
                    .from('pending_firm_registrations')
                    .select('id')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();

                await supabase.auth.signOut();
                throw new Error(pendingReg ? 'Email verification incomplete. Check your inbox.' : 'User profile not found.');
            }

            if (profile.status === 'locked' || profile.status === 'suspended') {
                const statusMsg = profile.status === 'locked' ? 'Account locked.' : 'Account suspended.';
                await supabase.auth.signOut();
                if (profile.status === 'locked') navigate('/auth/locked');
                throw new Error(statusMsg);
            }

            // STEP 3: Fetch User Role & Firm
            const { data: userFirmRole, error: roleError } = await supabase
                .from('user_firm_roles')
                .select('role, firm_id')
                .eq('user_id', authData.user.id)
                .eq('status', 'active')
                .limit(1)
                .single();

            if (roleError || !userFirmRole) {
                await supabase.auth.signOut();
                throw new Error('You are not authorized for any firm.');
            }

            // STEP 4: Create Internal Session
            const newSessionRes = await createSession.mutateAsync({
                firmId: userFirmRole.firm_id,
                role: userFirmRole.role
            });

            // Map and clean up nested profile object manually for local cache consistency
            const newSession = {
                ...newSessionRes,
                email: email, // use local email since we just logged in
                full_name: profile.full_name // if we had it, but we only selected status. 
                // Let's rely on the query invalidation to fill the rest, or just navigate.
            };

            // CRITICAL: Manually update cache to provide immediate session for useEffect
            queryClient.setQueryData(['internal_session'], newSession);

            // STEP 5: Redirect
            // The useEffect will handle redirect once ['internal_session'] is updated.
            // We explicitly DON'T navigate here to avoid unmount-vs-state-update races.

        } catch (err: any) {
            console.error('Login error detailed:', err);

            // Ignore AbortError if we are navigating away anyway
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;

            if (err.message?.includes('Email not confirmed')) {
                setError('Email not verified. Re-sending link...');
                await supabase.auth.resend({ type: 'signup', email });
            } else {
                setError(err.message || 'Login failed.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-white relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900/20 via-[#0F172A] to-[#0F172A]" />
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-[2rem] backdrop-blur-xl relative z-10 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2 tracking-tight">Internal Portal</h1>
                    <p className="text-slate-400 font-medium">Secure Access for CaseBridge Staff</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 font-medium"
                                placeholder="name@firm.com"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                            <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Forgot?</a>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#1E293B] border border-slate-700 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600 font-medium"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-lg shadow-white/5"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Authenticating...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    <p className="text-center text-xs text-slate-600 mt-6">
                        Protected by enterprise-grade encryption.
                        <br />
                        Unauthorized access is prohibited.
                    </p>
                </form>
            </div>

            <div className="absolute bottom-6 text-center text-[10px] text-slate-700 font-mono">
                CASEBRIDGE INTERNAL v2.0.0
            </div>
        </div>
    );
}
