import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useInternalSession } from '@/hooks/useInternalSession';
import { Loader2, ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import AuthNavbar from '@/components/layout/AuthNavbar';

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
                .maybeSingle();

            if (roleError || !userFirmRole) {
                await supabase.auth.signOut();
                throw new Error('You are not authorized for any firm.');
            }

            // STEP 4: Create Internal Session
            const newSessionRes = await createSession.mutateAsync({
                firmId: userFirmRole.firm_id,
                role: userFirmRole.role
            });

            // CRITICAL: Manually update cache to provide immediate session for useEffect
            queryClient.setQueryData(['internal_session'], newSessionRes);

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
        <>
            <AuthNavbar variant="internal" />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-6 text-white relative overflow-hidden pt-24">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/30 via-transparent to-transparent" />
                    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />

                    {/* Floating Orbs */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                </div>

                {/* Glassmorphic Card */}
                <div className="w-full max-w-md relative z-10">
                    <div className="bg-white/[0.03] border border-white/[0.08] p-10 rounded-3xl backdrop-blur-2xl relative shadow-2xl shadow-black/50">
                        {/* Glass shine effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <div className="text-center mb-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30 relative group">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <ShieldCheck className="w-10 h-10 text-white relative z-10" />
                                </div>
                                <h1 className="text-4xl font-black mb-3 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    Internal Portal
                                </h1>
                                <p className="text-slate-400 font-medium">Secure Access for CaseBridge Staff</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-xl text-red-200 p-4 rounded-2xl mb-6 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.05] transition-all placeholder:text-slate-600 font-medium backdrop-blur-xl"
                                            placeholder="name@firm.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            Password
                                        </label>
                                        <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                                            Forgot?
                                        </a>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.05] transition-all placeholder:text-slate-600 font-medium backdrop-blur-xl"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]"
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

                                <p className="text-center text-xs text-slate-600 mt-6 leading-relaxed">
                                    Protected by enterprise-grade encryption.
                                    <br />
                                    Unauthorized access is prohibited.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 text-center text-[10px] text-slate-700 font-mono tracking-wider">
                    CASEBRIDGE INTERNAL v2.0.0
                </div>
            </div>
        </>
    );
}
